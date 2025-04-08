import fs from 'node:fs'
import path from 'node:path'

export const VITEST_PROFILER_DIRECTORY = './test-profiles'

/**
 * @param {string} filename
 * @return {string}
 */
export function createProfileName(filename) {
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '--')

  return `${timestamp}--${filename}`
}

export const mainThreadCpuProfileName = createProfileName(
  'main-thread.cpuprofile',
)

/**
 * Vitest Profiler Plugin.
 * Add this to the `plugins` array of your Vite/Vitest configuration.
 *
 * @example
 * // vite.config.js
 * import { vitestProfiler } from 'vitest-profiler/plugin'
 *
 * export default defineConfig({
 *   plugins: [vitestProfiler()]
 * })
 *
 * @return {import('vite').Plugin}
 */
export function vitestProfiler() {
  const generatedProfiles = [
    {
      name: 'main-thread',
      cpuProfilePath: path.join(
        VITEST_PROFILER_DIRECTORY,
        mainThreadCpuProfileName,
      ),
    },
  ]

  return {
    name: 'vitest-profiler-plugin',
    enforce: 'pre',
    async config(config) {
      if (fs.existsSync(VITEST_PROFILER_DIRECTORY)) {
        await fs.promises.rmdir(VITEST_PROFILER_DIRECTORY, {
          recursive: true,
          force: true,
        })
      }

      const cpuProfileName = createProfileName('tests.cpuprofile')
      const heapProfileName = createProfileName('tests.heapprofile')

      const execArgv = [
        '--cpu-prof',
        `--cpu-prof-dir=${PROFILES_DIRECTORY}`,
        `--cpu-prof-name=${cpuProfileName}`,
        '--heap-prof',
        `--heap-prof-dir=${PROFILES_DIRECTORY}`,
        `--heap-prof-name=${heapProfileName}`,
      ]

      generatedProfiles.push({
        name: 'tests',
        cpuProfilePath: path.join(PROFILES_DIRECTORY, cpuProfileName),
        heapProfilePath: path.join(PROFILES_DIRECTORY, heapProfileName),
      })

      const overrides =
        config.test?.pool === 'threads'
          ? {
              threads: {
                singleThread: true,
                execArgv,
              },
            }
          : {
              forks: {
                singleFork: true,
                execArgv,
              },
            }

      config.test = {
        ...(config.test || {}),
        watch: false,
        poolOptions: {
          ...(config.test?.poolOptions || {}),
          ...overrides,
        },
      }

      return config
    },
    buildEnd() {
      generatedProfiles.forEach((profile) => {
        console.log(`
	${profile.name}:
${[
  ['CPU', profile.cpuProfilePath],
  ['Heap', profile.heapProfilePath],
]
  .filter(([_, profilePath]) => !!profilePath)
  .map(([profileName, profilePath]) => `    - ${profileName}:\t${profilePath}`)
  .join('\n')}
`)
      })
    },
  }
}
