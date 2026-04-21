import { useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './ProfileButton.css';

export function ProfileButton() {
  const { user, onSignOut } = useApp();
  const [showMenu, setShowMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await onSignOut();
      setShowMenu(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="profile-button-container">
      <button
        className="profile-button"
        onClick={() => setShowMenu(!showMenu)}
        title={user.email || 'User'}
      >
        <User size={20} />
      </button>

      {showMenu && (
        <div className="profile-menu">
          <div className="profile-menu-header">
            <p className="profile-email">{user.email}</p>
          </div>
          <button
            className="profile-menu-item sign-out"
            onClick={handleSignOut}
          >
            <LogOut size={16} />
            <span>Déconnexion</span>
          </button>
        </div>
      )}
    </div>
  );
}
