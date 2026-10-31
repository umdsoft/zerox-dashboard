import { reactive } from 'vue';

// Yengil toast ombori (Swal'siz — asosiy chunk kichik qoladi). ToastHost.vue ko'rsatadi.
export const toasts = reactive([]);
let nextId = 1;

export function notify(text, type = 'info', ms = 4500) {
  const id = nextId++;
  toasts.push({ id, text: String(text), type });
  setTimeout(() => dismiss(id), ms);
  return id;
}

export function dismiss(id) {
  const i = toasts.findIndex((t) => t.id === id);
  if (i >= 0) toasts.splice(i, 1);
}

export const toastOk = (t) => notify(t, 'success');
export const toastErr = (t) => notify(t, 'error', 6500);
