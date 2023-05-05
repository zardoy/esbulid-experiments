//@ts-check
import { analyzeMetafile, context } from 'esbuild'
import { default as figSpecFileNames, diffVersionedCompletions } from '@withfig/autocomplete/build/index.js'
import { writeFileSync } from 'fs'

//@ts-ignore
const dev = process.argv.includes('--watch')

const ctx = await context({
    bundle: true,
    logLevel: 'info',
    entryPoints: ['./index.js'],
    mainFields: ['module', 'main'],
    platform: 'browser',
    format: 'cjs',
    external: ['vscode'],
    treeShaking: true,
    outfile: 'out/index.js',
    sourcemap: dev,
    keepNames: dev,
    minify: !dev,
    metafile: true,
    plugins: [
        {
            name: 'import-all-specs',
            setup(build) {
                const specFileNames = figSpecFileNames.filter(name => !diffVersionedCompletions.includes(name) && !name.includes('/'))
                const namespace = 'FIG_ALL_SPECS'
                build.onResolve({ filter: new RegExp(`^${namespace}$`) }, () => {
                    return {
                        namespace,
                        path: namespace,
                    }
                })
                build.onLoad({ filter: /.*/, namespace }, async () => {
                    return {
                        contents: `export default [${specFileNames.map(name => `require('@withfig/autocomplete/build/${name}')`).join(',')}]`,
                        loader: 'ts',
                        resolveDir: '.',
                    }
                })
            },
        },
        {
            name: 'provide-shims',
            setup(build) {
                const namespace = 'buffer'
                build.onResolve({ filter: new RegExp(`^${namespace}$`) }, () => {
                    return {
                        namespace,
                        path: namespace,
                    }
                })
                build.onLoad({ filter: /.*/, namespace }, async () => {
                    return {
                        contents: `export class Buffer {}`,
                        loader: 'ts',
                        resolveDir: '.',
                    }
                })
            },
        },
    ],
})

if (dev) await ctx.watch()
else {
    const { metafile } = await ctx.rebuild()
    // writeFileSync('metafile', JSON.stringify(metafile))
    console.log(await analyzeMetafile(metafile))
    ctx.dispose()
}
