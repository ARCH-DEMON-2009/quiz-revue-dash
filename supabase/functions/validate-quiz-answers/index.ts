import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserAnswer {
  questionId: string;
  selected: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { testId, userAnswers, timeTaken, testName } = await req.json();

    if (!testId || !userAnswers || !testName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: testId, userAnswers, testName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Validating answers for test ${testId} by user ${user.id}`);

    // Fetch questions with correct answers and options server-side
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, correct, subject, marks, negative_marks, options, question_type')
      .eq('test_id', testId);

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No questions found for this test' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper function to get option text from letter (A, B, C, D)
    const getOptionTextFromLetter = (options: any, letter: string): string | null => {
      if (!options || !letter) return null;
      
      const letterIndex = letter.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
      
      // Handle array of options
      if (Array.isArray(options)) {
        return options[letterIndex] || null;
      }
      
      // Handle object with keys like "A", "B", "C", "D" or "a", "b", "c", "d"
      if (typeof options === 'object') {
        return options[letter.toUpperCase()] || options[letter.toLowerCase()] || null;
      }
      
      // Handle JSON string
      if (typeof options === 'string') {
        try {
          const parsed = JSON.parse(options);
          if (Array.isArray(parsed)) {
            return parsed[letterIndex] || null;
          }
          if (typeof parsed === 'object') {
            return parsed[letter.toUpperCase()] || parsed[letter.toLowerCase()] || null;
          }
        } catch {
          return null;
        }
      }
      
      return null;
    };

    // Helper function to get correct option letter from correct answer text
    const getCorrectOptionLetter = (options: any, correctAnswer: string): string | null => {
      if (!options || !correctAnswer) return null;
      
      const normalizedCorrect = correctAnswer.toLowerCase().trim();
      
      // Handle array of options
      if (Array.isArray(options)) {
        const index = options.findIndex(opt => 
          opt && opt.toString().toLowerCase().trim() === normalizedCorrect
        );
        if (index !== -1) {
          return String.fromCharCode(65 + index); // 0=A, 1=B, etc.
        }
      }
      
      // Handle object with keys
      if (typeof options === 'object' && !Array.isArray(options)) {
        for (const [key, value] of Object.entries(options)) {
          if (value && value.toString().toLowerCase().trim() === normalizedCorrect) {
            return key.toUpperCase();
          }
        }
      }
      
      // Handle JSON string
      if (typeof options === 'string') {
        try {
          const parsed = JSON.parse(options);
          return getCorrectOptionLetter(parsed, correctAnswer);
        } catch {
          return null;
        }
      }
      
      return null;
    };

    // Create a map of question id to correct answer
    const questionMap = new Map(questions.map(q => [q.id, q]));

    // Validate answers server-side
    let correct = 0;
    let incorrect = 0;
    let marksObtained = 0;
    const subjectStats: Record<string, { correct: number; total: number }> = {};
    const validatedAnswers: Array<{ questionId: string; selected: string | null; isCorrect: boolean }> = [];

    // Initialize subject stats
    questions.forEach(q => {
      if (!subjectStats[q.subject]) {
        subjectStats[q.subject] = { correct: 0, total: 0 };
      }
      subjectStats[q.subject].total++;
    });

    // Process each user answer
    (userAnswers as UserAnswer[]).forEach(answer => {
      const question = questionMap.get(answer.questionId);
      if (!question) return;

      let isCorrect = false;
      
      if (answer.selected) {
        const userSelected = answer.selected.trim();
        const correctAnswer = question.correct?.trim() || '';
        
        // Check if user selected a letter (A, B, C, D)
        const isLetterSelection = /^[A-Da-d]$/.test(userSelected);
        
        if (isLetterSelection && question.options) {
          // User selected a letter, compare with correct answer
          // Method 1: Get the option text for the selected letter and compare
          const selectedOptionText = getOptionTextFromLetter(question.options, userSelected);
          if (selectedOptionText) {
            isCorrect = selectedOptionText.toLowerCase().trim() === correctAnswer.toLowerCase();
          }
          
          // Method 2: If correct answer is also a letter, compare directly
          if (!isCorrect && /^[A-Da-d]$/.test(correctAnswer)) {
            isCorrect = userSelected.toUpperCase() === correctAnswer.toUpperCase();
          }
          
          // Method 3: Get the correct option letter and compare with user's selection
          if (!isCorrect) {
            const correctLetter = getCorrectOptionLetter(question.options, correctAnswer);
            if (correctLetter) {
              isCorrect = userSelected.toUpperCase() === correctLetter.toUpperCase();
            }
          }
        } else {
          // Direct text comparison for text-type questions or when no options
          isCorrect = userSelected.toLowerCase() === correctAnswer.toLowerCase();
        }
      }
      
      validatedAnswers.push({
        questionId: answer.questionId,
        selected: answer.selected,
        isCorrect
      });

      if (answer.selected) {
        if (isCorrect) {
          correct++;
          marksObtained += question.marks || 4;
          subjectStats[question.subject].correct++;
        } else {
          incorrect++;
          marksObtained -= question.negative_marks || 1;
        }
      }
    });

    const skipped = questions.length - validatedAnswers.filter(a => a.selected).length;
    const maxMarks = questions.reduce((total, q) => total + (q.marks || 4), 0);
    const percentage = maxMarks > 0 ? (marksObtained / maxMarks) * 100 : 0;

    // Save results to database
    const { data: result, error: insertError } = await supabase
      .from('test_results')
      .insert({
        user_id: user.id,
        test_id: testId,
        test_name: testName,
        correct,
        incorrect,
        skipped,
        total: questions.length,
        marks_obtained: marksObtained,
        max_marks: maxMarks,
        percentage: Math.max(0, percentage),
        user_answers: validatedAnswers,
        subject_stats: subjectStats,
        time_taken: timeTaken || 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving results:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Results saved: ${correct}/${questions.length} correct, ${marksObtained} marks`);

    return new Response(
      JSON.stringify({
        success: true,
        resultId: result.id,
        correct,
        incorrect,
        skipped,
        total: questions.length,
        marksObtained,
        maxMarks,
        percentage: Math.max(0, percentage)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-quiz-answers:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
