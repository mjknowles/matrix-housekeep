APP_NAME = 'matrix-housekeep'
IMAGE_NAME = 'matrix-housekeep'

k8s_yaml([
  'k8s/deployment.yaml',
  'k8s/service.yaml',
])

local_resource(
  'patch-mas-config',
  'kubectl apply -f k8s/mas-configmap-patch.yaml',
  deps=['k8s/mas-configmap-patch.yaml'],
)

local_resource(
  'patch-synapse-config',
  'kubectl patch configmap ess-synapse -n ess --type merge --patch-file k8s/synapse-configmap-patch.yaml',
  deps=['k8s/synapse-configmap-patch.yaml'],
)


docker_build(
  IMAGE_NAME,
  '.',
  dockerfile='Dockerfile.dev',
  ignore=[
    '.git',
    '.svelte-kit',
    'build',
    'dist',
    'node_modules',
  ],
  live_update=[
    sync('src', '/app/src'),
    sync('static', '/app/static'),
    sync('drizzle.config.ts', '/app/drizzle.config.ts'),
    sync('svelte.config.js', '/app/svelte.config.js'),
    sync('vite.config.ts', '/app/vite.config.ts'),
    sync('tsconfig.json', '/app/tsconfig.json'),
    run('pnpm install --frozen-lockfile', trigger=['package.json', 'pnpm-lock.yaml']),
  ],
)

k8s_resource(APP_NAME, port_forwards=5173)
