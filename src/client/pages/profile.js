// src/client/pages/profile.js
import api from '../api/api.js';

export async function ProfilePage() {
  const element = document.createElement('div');
  element.innerHTML = '<p>Loading profile...</p>';

  try {
    const profileData = await api.get('/api/profile');
    element.innerHTML = `
      <h2>Profile</h2>
      <p><strong>Username:</strong> ${profileData.username}</p>
      <p><strong>Display Name:</strong> ${profileData.display_name}</p>
      <p><strong>Bio:</strong> ${profileData.bio || 'Not set'}</p>
    `;
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    element.innerHTML = `
      <h2>Error</h2>
      <p>Could not load your profile. Please try logging in again.</p>
    `;
  }

  return element;
}