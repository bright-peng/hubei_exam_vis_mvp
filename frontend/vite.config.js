
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  return {
    base: mode === 'production' ? '/hubei_exam_vis_mvp/' : '/',
    plugins: [react()],
    server: {
      port: 5173
    }
  }
})
