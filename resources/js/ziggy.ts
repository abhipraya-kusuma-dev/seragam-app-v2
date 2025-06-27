export const routes = {
    'admin-gudang.items.index': { uri: '/admin/gudang/items', methods: ['GET'] },
    'admin-gudang.items.create': { uri: '/admin/gudang/items/create', methods: ['GET'] },
    'admin-gudang.items.store': { uri: '/admin/gudang/items', methods: ['POST'] },
} as const;

export const Ziggy = {
    port: '',
    secure: true,
    scheme: 'https',
    host: window.location.hostname,
    basePath: '',
    location: window.location,
    routes,
} as const;
