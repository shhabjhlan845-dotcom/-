
import React from 'react';

const iconProps = {
  width: "24",
  height: "24",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round" as "round",
  strokeLinejoin: "round" as "round",
  "aria-hidden": "true",
};

export const UploadIcon: React.FC = () => (
  <svg {...iconProps}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
);

export const ConvertIcon: React.FC = () => (
  <svg {...iconProps}><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
);

export const AIBrainIcon: React.FC = () => (
  <svg {...iconProps}><path d="M12 2a10 10 0 0 0-4.32 18.04s.48.26.48-1.7V17.5s-.24-.48-.96-1.44c-1.2-1.2-1.2-1.44-1.2-1.44s0-1.2 2.16-1.2c2.16 0 2.4 2.16 2.4 2.16v.48c.5.24 1.2.24 1.2.24s1.2 0 1.2-.24v-.48s.24-2.16 2.4-2.16c2.16 0 2.16 1.2 2.16 1.2s0 .24-1.2 1.44c-.72.96-.96 1.44-.96 1.44v1.32c0 1.96.48 1.7.48 1.7A10 10 0 0 0 12 2Z"></path></svg>
);

export const MicIcon: React.FC = () => (
  <svg {...iconProps}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>
);

export const StopIcon: React.FC = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="10"></circle><rect x="9" y="9" width="6" height="6"></rect></svg>
);

export const DownloadIcon: React.FC = () => (
    <svg {...iconProps}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
);

export const CloseIcon: React.FC = () => (
    <svg {...iconProps}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
