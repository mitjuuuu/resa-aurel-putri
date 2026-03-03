import { create } from 'zustand';
import axios from 'axios';

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
}));

interface EditorElement {
  id: string;
  type: 'text' | 'image' | 'heading' | 'table';
  x: number;
  y: number;
  content: string;
  fontSize?: number;
  fontWeight?: string;
  width?: number;
  height?: number;
}

interface EditorState {
  elements: EditorElement[];
  selectedId: string | null;
  addElement: (element: Partial<EditorElement>) => void;
  updateElement: (id: string, updates: Partial<EditorElement>) => void;
  removeElement: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  setElements: (elements: EditorElement[]) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  elements: [],
  selectedId: null,
  addElement: (element) => set((state) => ({
    elements: [...state.elements, {
      id: Math.random().toString(36).substr(2, 9),
      type: 'text',
      x: 50,
      y: 50,
      content: 'New Text',
      fontSize: 16,
      ...element
    } as EditorElement]
  })),
  updateElement: (id, updates) => set((state) => ({
    elements: state.elements.map((el) => el.id === id ? { ...el, ...updates } : el)
  })),
  removeElement: (id) => set((state) => ({
    elements: state.elements.filter((el) => el.id !== id),
    selectedId: state.selectedId === id ? null : state.selectedId
  })),
  setSelectedId: (id) => set({ selectedId: id }),
  setElements: (elements) => set({ elements }),
}));
