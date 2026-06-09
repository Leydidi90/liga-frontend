const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
// Eliminar diagonal al final si existe para evitar el error de doble diagonal //
const API_URL = rawUrl.replace(/\/$/, '');

export default API_URL;
