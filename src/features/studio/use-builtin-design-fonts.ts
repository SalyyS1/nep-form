import { useEffect, useState } from 'react';
import type { DesignProject } from '../../../shared/custom-types';
import { hasBuiltinFont, registerBuiltinFont } from '../../../shared/builtin-font-runtime.mjs';

const loaders = import.meta.glob<string>('../../../shared/builtin-font-data/*.mjs', { import: 'default' });
const pending = new Map<string, Promise<void>>();
function load(value: string) {
  if (hasBuiltinFont(value)) return Promise.resolve();
  if (!pending.has(value)) {
    const loader = loaders[`../../../shared/builtin-font-data/${value.slice(8)}.mjs`];
    const task = loader ? loader().then(css => registerBuiltinFont(value, css)) : Promise.reject(new Error('Unknown font'));
    pending.set(value, task.catch(error => { pending.delete(value); throw error; }));
  }
  return pending.get(value)!;
}
export function useBuiltinDesignFonts(project: DesignProject) {
  const key = [...new Set(Object.values(project.faces).flatMap(face => face.layers.filter(layer => layer.kind === 'text' && layer.fontFamily?.startsWith('builtin:')).map(layer => layer.fontFamily!)))].sort().join(',');
  const [loaded, setLoaded] = useState(''); const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all(key.split(',').filter(Boolean).map(load)).then(() => { if (active) { setLoaded(key); setError(''); } }).catch(() => { if (active) setError('Chưa tải được phông Việt. Tải lại trang để thử tiếp nhé.'); });
    return () => { active = false; };
  }, [key]);
  return { loading: loaded !== key && !error, error };
}
