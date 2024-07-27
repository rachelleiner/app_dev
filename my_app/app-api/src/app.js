const API_URL = 'https://cod-destined-secondly.ngrok-free.app/api';

export const createParty = async (partyName) => {
    const response = await fetch(`${API_URL}/party/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ partyName }),
      credentials: 'include',
    });
  
    return handleResponse(response);
  };