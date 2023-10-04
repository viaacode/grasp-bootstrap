import { Parser, TreeToGraphQL } from 'graphql-js-tree';
import * as fs from 'fs';
import { program } from 'commander';
import {join, dirname} from 'path';

program
  .requiredOption('-i, --inputFile <graphqlFile>')
  .option('-o, --outputDir [outputDir]', './')
  .parse();

const options = program.opts();

const schemaFileContents = fs.readFileSync(options.inputFile,
{ encoding: 'utf8', flag: 'r' });
const parsedSchema = Parser.parse(schemaFileContents);

const filters = {}

const queryNode = parsedSchema.nodes.find(i => (i.type.fieldType.name === 'type' && i.name === 'Query'))
for (const arg of queryNode.args){
    filters[arg.type.fieldType.nest.name] = arg.args
}

for (const i of parsedSchema.nodes){
    if(i.type.fieldType.name === 'type' && i.name !== 'Query'){
        let queryString = 'PREFIX : <https://github.com/dbcls/grasp/ns/>\n\n'
        queryString += '# ${i.name}\n'
        queryString += 'CONSTRUCT {\n'
        
        for (let n=0;n < i.args.length; n++){
            const arg = i.args[n]
            if (n === 0)
                queryString += `  ?iri :${arg.name} ?${arg.name} ;\n`
            if (n > 0 && n < i.args.length -1)
                queryString += `       :${arg.name} ?${arg.name} ;\n`
            if (n == i.args.length -1)
                queryString += `       :${arg.name} ?${arg.name} .\n`
        }
        queryString += '} WHERE {\n'
        queryString += `  ?iri a :${i.name} .`
        for (const arg of i.args){
            queryString += `  BIND(?${arg.name}_res AS ?${arg.name})\n`
        }
        queryString += '  {{#if iri}}\n'
        queryString += '  VALUES ?iri { {{join " " (as-iriref iri)}} }\n'
        queryString += '  {{/if}}\n'

        if (filters[i.name]){
            for (const arg of filters[i.name]){
                queryString += `  {{#if ${arg.name}}}\n`
                queryString += `  VALUES ?${arg.name}_res { {{${arg.name}}} }\n`
                queryString += `  {{/if}}\n`
            }
        }

        queryString += '}'
        fs.mkdirSync(options.outputDir, {recursive: true})
        fs.writeFileSync(join(options.outputDir, `${i.name}.sparql`), queryString);   
    }
}