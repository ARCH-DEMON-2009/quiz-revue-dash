import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

/**
 * Handles saving and sharing PDFs on mobile via Capacitor, 
 * or normal browser download on web.
 */
export const handleMobilePdfDownload = async (pdfBlob: Blob, fileName: string) => {
  if (!Capacitor.isNativePlatform()) {
    // Standard web download
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  try {
    // Read blob as base64 for Capacitor Filesystem
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]); // Remove data:application/pdf;base64,
      };
    });
    reader.readAsDataURL(pdfBlob);
    const base64Data = await base64Promise;

    // Save to device
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache,
    });

    // Share/Open
    await Share.share({
      title: 'Download Result PDF',
      text: 'Here is your Test Sagar result.',
      url: savedFile.uri,
      dialogTitle: 'Save or Share PDF',
    });
  } catch (error) {
    console.error('Mobile PDF error:', error);
    toast.error('Could not save PDF to device.');
  }
};
