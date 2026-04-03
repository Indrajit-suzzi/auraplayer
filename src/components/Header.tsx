import React from 'react';
import { Folder, PlusSquare, Settings } from 'lucide-react';

interface HeaderProps {
  currentMediaName: string | undefined;
  setIsSettingsOpen: (v: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ currentMediaName, setIsSettingsOpen }) => {
  return (
    <header className="master-header glass">
      <div className="header-left">
        <label htmlFor="folder-up" className="library-tag">
          <Folder size={14} /> <span>FOLDER</span>
        </label>
        <label htmlFor="file-up" className="library-tag" style={{ marginLeft: '10px' }}>
          <PlusSquare size={14} /> <span>ADD FILES</span>
        </label>
      </div>
      <div className="title-text">{currentMediaName || 'Waiting for media...'}</div>
      <Settings size={20} className="icon-btn" onClick={() => setIsSettingsOpen(true)} />
    </header>
  );
};

export default Header;
