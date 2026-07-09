// Canonical API configuration for the Dashboard
export const getApiUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: NEXT_PUBLIC_API_URL is not configured in production.');
    }
    return 'http://localhost:3001';
  }
  return url.replace(/\/$/, '');
};

export const getApiSecret = () => {
  const secret = process.env.API_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: API_SECRET is not configured in production.');
  }
  return secret || '';
};

export const checkApiHealth = async () => {
  try {
    const res = await fetch(`${getApiUrl()}/health`, { cache: 'no-store' });
    if (!res.ok) return { healthy: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { healthy: data.status === 'healthy', error: null };
  } catch (err: any) {
    return { healthy: false, error: err.message };
  }
};
