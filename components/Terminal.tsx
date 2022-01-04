import '@fontsource/mononoki/index.css';
import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {XTerm}                                        from 'xterm-for-react';

import {FitAddon}                                     from './XTermFitAddon';

export function Terminal({termRef}: {termRef: React.Ref<XTerm>}) {
  const [open, setOpen] = useState(false);
  const fitRef = useRef(new FitAddon());

  useEffect(() => {
    let cancelled = false;

    document.fonts.load(`12px "Mononoki"`).then(() => {
      if (cancelled) return;
      setOpen(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    fitRef.current.fit();
  });

  return open ? <XTerm ref={termRef} className={`absolute inset-0`} options={{convertEol: true, fontFamily: `Mononoki, monospace`}} addons={[fitRef.current]}/> : null;
}
