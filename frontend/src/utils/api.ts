// Utility functions for API calls
export const getBackendUrl = (): string => {
  // In production, use the NEXT_PUBLIC_BACKEND_URL environment variable
  // In development, default to localhost:3001
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  console.log('Environment backend URL:', process.env.NEXT_PUBLIC_BACKEND_URL); // Debug log
  console.log('Using backend URL:', backendUrl); // Debug log
  return backendUrl;
};

export const getAuthUrl = async (): Promise<string> => {
  const backendUrl = getBackendUrl();
  console.log('Backend URL:', backendUrl); // Debug log
  const url = `${backendUrl}/api/auth/url`;
  console.log('Full URL:', url); // Debug log
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to get authentication URL');
  }
  
  const data = await response.json();
  return data.authUrl;
};

export const fetchFiles = async (endpoint: string, folderId: string, token?: string, searchTerm?: string) => {
  const backendUrl = getBackendUrl();
  const searchParam = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
  const url = `${backendUrl}/api/${endpoint}/drive/folder/${folderId}${searchParam}`;
  
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `Failed to fetch files: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};

export const fetchFolderPath = async (endpoint: string, folderId: string, token?: string) => {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}/api/${endpoint}/drive/path/${folderId}`;
  
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `Failed to fetch folder path: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};

export const fetchEmbedFiles = async (folderId: string, apiKey: string) => {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}/api/embed/folder/${folderId}`;
  
  const response = await fetch(url, {
    headers: {
      'X-API-Key': apiKey
    }
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `Failed to fetch files: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};

export const fetchPdf = async (fileId: string, token: string) => {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}/api/private/drive/pdf/${fileId}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `Failed to fetch PDF: ${response.status} ${response.statusText}`);
  }
  
  return await response.arrayBuffer();
};