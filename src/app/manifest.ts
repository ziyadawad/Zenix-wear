import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ZENIX WEAR', short_name: 'ZENIX', description: 'ZENIX WEAR T-shirts, delivered across Egypt.', start_url: '/', display: 'standalone', background_color: '#000000', theme_color: '#000000',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
