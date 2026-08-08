import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * This file exists to satisfy a specific routing requirement or to handle 
 * direct navigation to /src/routes/index.tsx.
 */
const RoutesIndex = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home if someone lands here directly
    navigate("/", { replace: true });
  }, [navigate]);

  return (
    <div className="hidden" aria-hidden="true">
      Full Project Audit, Debug & Fix — Replit Agent

You are a senior full-stack software engineer, debugger, security reviewer, and QA engineer.

Your job is to fully inspect, test, debug, and fix this entire Replit project. Do not only look at the obvious files. Analyze the complete codebase and make the application production-ready.

1. First: Analyze the Entire Project

Before changing anything:

Read and understand the entire project/codebase.

Inspect all source files, configuration files, routes, components, APIs, database code, authentication, middleware, utilities, scripts, and assets.

Check package.json, lock files, environment-variable usage, build configuration, deployment configuration, and other project configuration.

Understand how the frontend, backend, APIs, database, authentication, and external services communicate.

Identify the application's intended functionality from the existing code.

Do not remove existing functionality just because it is unfamiliar.

Create an internal checklist of everything that needs to be tested and fixed.

2. Find ALL Errors and Bugs

Perform a comprehensive audit for:

Frontend

JavaScript/TypeScript errors

React/component errors

Broken imports

Undefined variables

Incorrect state management

Incorrect props

Broken forms

Broken buttons

Broken navigation

Broken links

Routing problems

UI rendering problems

Console errors

Mobile/responsive issues

Loading-state problems

Empty-state problems

Error-state problems

Race conditions

Memory leaks

Incorrect API calls

Incorrect data handling

Accessibility problems

Backend

API errors

Broken routes

Incorrect HTTP methods/status codes

Missing validation

Incorrect request/response handling

Authentication/authorization bugs

Middleware problems

Database errors

Missing error handling

Async/await problems

Unhandled exceptions

Incorrect environment variables

Security vulnerabilities

CORS problems

Rate-limit issues where applicable

Incorrect server configuration

Database

Broken queries

Incorrect schemas

Missing migrations

Incorrect relationships

Null/undefined handling

Duplicate records

Data validation issues

Connection problems

Error handling

Potential data-loss bugs

Authentication & Security

Check for:

Authentication bypasses

Authorization problems

Exposed secrets

API keys accidentally committed to source code

Unsafe environment-variable usage

XSS

SQL injection

CSRF where applicable

Insecure cookies

Weak session handling

Improper password handling

Unsafe user input

Missing server-side validation

Sensitive information exposed to the client

Debug/development settings accidentally enabled in production

Never expose, print, or commit secrets.

3. Check Dependencies

Inspect all dependencies.

Find outdated or incompatible packages where they can cause problems.

Detect dependency conflicts.

Detect missing dependencies.

Detect unused dependencies when relevant.

Make sure package versions work together.

Do not blindly upgrade everything.

Only change dependencies when there is a concrete reason.

4. Test the Application

Actually run the application and test it.

Do not assume the code works just because it looks correct.

Run appropriate:

Install commands

Type checking

Linting

Unit tests

Integration tests

Build commands

Development server

Production build

Other existing test scripts

Fix any errors you encounter.

If browser testing is available, test the application through the browser as a real user.

Test:

Homepage

Navigation

Every major page

Every important button

Forms

Authentication

CRUD operations

API requests

Database operations

Error handling

Loading states

Empty states

Mobile/responsive layout

Logout/session behavior

Refreshing pages

Direct URL access

Invalid input

Unauthorized access

404 pages

Production build

5. Fix Everything You Find

For every real bug/error:

Identify the root cause.

Fix the underlying problem.

Check for related bugs caused by the same issue.

Re-run the relevant test.

Verify that the fix did not break another feature.

Do not apply superficial patches just to hide errors.

Do not disable functionality, tests, lint rules, security checks, or error reporting simply to make the project appear successful.

6. Preserve Existing Functionality

IMPORTANT:

Do not rewrite the entire application unnecessarily.

Do not remove features.

Do not replace working code without a reason.

Do not change the application's design unnecessarily.

Preserve existing API contracts unless they are actually broken.

Preserve the existing database structure unless a change is genuinely required.

Keep the project's current architecture unless there is a strong technical reason to improve it.

If a change could break existing functionality, inspect all affected code before making it.

7. Production-Readiness Check

After fixing bugs, verify:

npm run build or the project's equivalent works.

Production startup works.

No critical console errors remain.

No server crashes occur.

No broken API endpoints remain.

No broken routes remain.

Environment variables are handled correctly.

Secrets are not exposed.

Error handling is appropriate.

User input is validated.

Authentication and authorization work correctly.

Database operations work correctly.

The application works after a fresh restart.

The application works in production mode.

8. Performance Check

Look for obvious performance problems such as:

Unnecessary API requests

Duplicate requests

Excessive database queries

Infinite loops

Unnecessary component re-renders

Huge assets

Blocking operations

Memory leaks

Poor caching

Inefficient queries

Large unnecessary dependencies

Only make performance changes that are safe and justified.

9. Final Verification

After all fixes:

Run the complete test suite again.

Run the production build again.

Start the application again.

Re-test the important user flows.

Check logs.

Check browser console errors if browser testing is available.

Confirm that there are no remaining critical errors.

Do not stop after finding the first bug.

Continue until you have completed a full project-wide audit.

10. Final Report

When finished, give me a concise report containing:

Bugs Found

What was wrong

Where it was found

Severity

Fixes Made

What you changed

Why the change was necessary

Tests Performed

Commands/tests executed

Results

Remaining Issues

List anything that could not be verified or fixed.

Production Status

Give one of:

✅ Production Ready

⚠️ Mostly Ready — Minor Issues Remaining

❌ Not Production Ready

Do not claim "Production Ready" unless you actually verified the application.

Important Rules

Inspect the whole project before making major changes.

Fix root causes, not symptoms.

Do not stop at the first error.

Do not invent missing functionality.

Do not delete working features.

Do not expose secrets.

Do not hardcode API keys, passwords, tokens, or credentials.

Do not ignore errors just because they are unrelated to the current page.

Do not leave TODOs for bugs you can safely fix yourself.

If something genuinely requires my decision, clearly explain what decision is needed instead of guessing.

Prefer minimal, safe, maintainable changes.

After every significant fix, verify it.

The goal is a completely working, stable, secure, and production-ready application.

Start by auditing the entire project. Then fix the issues you find. Finally, test everything again and provide the final report.
    </div>
  );
};

export default RoutesIndex;

