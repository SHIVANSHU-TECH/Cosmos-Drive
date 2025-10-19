// Utility functions for API calls
export const getBackendUrl = (): string => {
  // In production, use the NEXT_PUBLIC_BACKEND_URL environment variable
  // In development, default to localhost:3001
  if (typeof window !== 'undefined') {
    // Client-side check
    console.log('Client-side environment variables:', {
      NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
      NODE_ENV: process.env.NODE_ENV
    });
  }
  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  // Remove trailing slash if present
  const cleanBackendUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
  console.log('Using backend URL:', cleanBackendUrl);
  return cleanBackendUrl;
};

// Fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout: number = 15000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export const getAuthUrl = async (): Promise<string> => {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}/api/auth/url`; // Add leading slash here
  console.log('Making request to:', url);
  
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }, 10000); // 10 second timeout
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to get authentication URL: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.authUrl;
  } catch (error) {
    console.error('Error fetching auth URL:', error);
    throw error;
  }
};

export const fetchFiles = async (endpoint: string, folderId: string, token?: string, searchTerm?: string) => {
  const backendUrl = getBackendUrl();
  const searchParam = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
  const url = `${backendUrl}/api/${endpoint}/drive/folder/${folderId}${searchParam}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetchWithTimeout(url, { 
    headers,
    // Cache for 5 minutes
    cache: 'force-cache'
  }, 12000); // 12 second timeout
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `Failed to fetch files: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};

export const fetchFolderPath = async (endpoint: string, folderId: string, token?: string) => {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}/api/${endpoint}/drive/path/${folderId}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetchWithTimeout(url, { headers }, 10000); // 10 second timeout
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `Failed to fetch folder path: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};

export const fetchEmbedFiles = async (folderId: string, apiKey: string) => {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}/api/embed/folder/${folderId}`;
  
  const response = await fetchWithTimeout(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    // Cache for 3 minutes for embed
    cache: 'force-cache'
  }, 15000); // 15 second timeout for embed
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `Failed to fetch files: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
};

export const fetchPdf = async (fileId: string, token: string) => {
  const backendUrl = getBackendUrl();
  // Use the public PDF endpoint to avoid 401 errors
  const url = `${backendUrl}/api/public/drive/pdf/${fileId}`;
  
  const response = await fetchWithTimeout(url, {}, 20000); // 20 second timeout for PDF
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || `Failed to fetch PDF: ${response.status} ${response.statusText}`);
  }
  
  return await response.arrayBuffer();
};