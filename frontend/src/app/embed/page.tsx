'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  iconLink?: string;
  webViewLink?: string;
  webContentLink?: string;
}

export default function EmbedPage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allowDownload, setAllowDownload] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get parameters from URL
        const apiKey = searchParams.get('key');
        const folderId = searchParams.get('folderid');
        const allowdl = searchParams.get('allowdl');
        
        // Set download permission
        setAllowDownload(allowdl !== 'no');
        
        if (!apiKey || !folderId) {
          throw new Error('Missing required parameters: key and folderid');
        }
        
        // Fetch files from our API using the correct endpoint
        const response = await fetch(`/api/embed/folder/${folderId}`, {
          headers: {
            'X-API-Key': apiKey
          }
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch files');
        }
        
        const data = await response.json();
        setFiles(data.files || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFiles();
  }, [searchParams]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading files...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Error</h3>
            <div className="mt-2 text-sm text-gray-500">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-800">Drive File Browser</h1>
            <p className="text-sm text-gray-600 mt-1">Files in this folder</p>
          </div>
          
          {files.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No files found</h3>
              <p className="mt-1 text-gray-500">This folder appears to be empty.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
              {files.map((file) => (
                <div key={file.id} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow bg-white">
                  <div className="flex items-center mb-3">
                    {getFileIcon(file.mimeType)}
                    <h3 className="font-medium text-gray-900 ml-2 truncate">{file.name}</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-4">
                    <a 
                      href={file.webViewLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 min-w-[80px] text-center px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      View
                    </a>
                    
                    {allowDownload && file.webContentLink && (
                      <a
                        href={file.webContentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[80px] text-center px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        Download
                      </a>
                    )}
                  </div>
                  
                  {file.size && (
                    <p className="mt-2 text-xs text-gray-500">
                      Size: {formatFileSize(file.size)}
                    </p>
                  )}
                  
                  {file.modifiedTime && (
                    <p className="mt-1 text-xs text-gray-500">
                      Modified: {new Date(file.modifiedTime).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('folder')) {
    return (
      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
      </svg>
    );
  } else if (mimeType.includes('pdf')) {
    return (
      <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
    );
  } else if (mimeType.includes('image')) {
    return (
      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
      </svg>
    );
  } else {
    return (
      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
    );
  }
}

function formatFileSize(bytes: string): string {
  const size = parseInt(bytes);
  if (size === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(size) / Math.log(k));
  
  return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}