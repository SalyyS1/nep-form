import { useCallback, useReducer, useRef } from 'react';
import type { DesignProject } from '../../../shared/custom-types';

type Update = DesignProject | ((current: DesignProject) => DesignProject);
interface History { project: DesignProject; past: DesignProject[]; future: DesignProject[] }
type Action = { type: 'commit' | 'preview'; update: Update } | { type: 'finish-drag'; start: DesignProject } | { type: 'undo' | 'redo' };
function reduce(state: History, action: Action): History {
  if (action.type === 'commit' || action.type === 'preview') {
    const next = typeof action.update === 'function' ? action.update(state.project) : action.update;
    if (JSON.stringify(next) === JSON.stringify(state.project)) return state;
    return action.type === 'preview' ? { ...state, project: next } : { project: next, past: [...state.past.slice(-49), state.project], future: [] };
  }
  if (action.type === 'finish-drag') return JSON.stringify(action.start) === JSON.stringify(state.project) ? state : { ...state, past: [...state.past.slice(-49), action.start], future: [] };
  if (action.type === 'undo' && state.past.length) return { project: state.past[state.past.length - 1], past: state.past.slice(0, -1), future: [state.project, ...state.future] };
  if (action.type === 'redo' && state.future.length) return { project: state.future[0], past: [...state.past.slice(-49), state.project], future: state.future.slice(1) };
  return state;
}
export function useDesignHistory(initial: () => DesignProject) {
  const [state, dispatch] = useReducer(reduce, undefined, () => ({ project: initial(), past: [], future: [] }));
  const dragStart = useRef<DesignProject | null>(null);
  const commit = useCallback((update: Update) => dispatch({ type: 'commit', update }), []);
  const preview = useCallback((update: Update) => dispatch({ type: 'preview', update }), []);
  function beginDrag() { dragStart.current = state.project; }
  function endDrag() { const start = dragStart.current; dragStart.current = null; if (start) dispatch({ type: 'finish-drag', start }); }
  return { project: state.project, commit, preview, beginDrag, endDrag, undo: () => dispatch({ type: 'undo' }), redo: () => dispatch({ type: 'redo' }), canUndo: !!state.past.length, canRedo: !!state.future.length };
}
