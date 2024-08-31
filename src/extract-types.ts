import fs from 'fs'
import path from 'path'
import ts from 'typescript'

function extractTypes(sourceFile: ts.SourceFile) {
    const types: { type: string; filename: string }[] = []

    function visit(node: ts.Node) {
        if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
            types.push({
                type: node.getText(sourceFile),
                filename: `~${sourceFile.fileName.split('/src/')[1]}`.replace(/(.ts|.tsx)$/g, ''),
            })
        }
        ts.forEachChild(node, visit)
    }

    visit(sourceFile)
    return types
}

function processProject(projectPath: string) {
    const configPath = ts.findConfigFile(projectPath, ts.sys.fileExists, 'tsconfig.json')
    if (!configPath) {
        throw new Error("Could not find a valid 'tsconfig.json'")
    }

    const { config } = ts.readConfigFile(configPath, ts.sys.readFile)
    const { options, fileNames } = ts.parseJsonConfigFileContent(
        config,
        ts.sys,
        path.dirname(configPath),
    )

    const program = ts.createProgram(fileNames, options)
    const typeDefinitions: { type: string; filename: string }[] = []

    for (const sourceFile of program.getSourceFiles()) {
        if (!sourceFile.isDeclarationFile && !sourceFile.fileName.includes('node_modules')) {
            typeDefinitions.push(...extractTypes(sourceFile))
        }
    }

    return typeDefinitions
}

const projectPath = path.resolve(__dirname, '../') // Use absolute path
const types = processProject(projectPath)
const output = types.map(type => `/* ${type.filename} */\n${type.type}`).join('\n\n')

if (output) {
    fs.writeFileSync(
        'extracted-types.d.ts',
        '/* This file is a utility to easily include types in AI prompting */\n\n',
    )
    fs.appendFileSync('extracted-types.d.ts', output)
    console.log('Types extracted and written to extracted-types.d.ts')
} else {
    console.log('No types found')
}
