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

for (const i of parsedSchema.nodes){
    if(i.type.fieldType.name === 'type'){
        let queryString = 'PREFIX : <https://github.com/dbcls/grasp/ns/>\n\n'
        queryString += '# ${i.name}\n'
        queryString += 'CONSTRUCT {\n'
        
        for (const arg of i.args){
            queryString += `  ?iri :${arg.name} ?${arg.name} .\n`
        }
        queryString += '} WHERE {\n'
        for (const arg of i.args){
            queryString += `  BIND(?${arg.name}_res AS ?${arg.name})\n`
        }
        queryString += '  {{#if iri}}\n'
        queryString += '  VALUES ?iri { {{join " " (as-iriref iri)}} }\n'
        queryString += '  {{/if}}\n'
        queryString += '}'
        fs.mkdirSync(options.outputDir, {recursive: true})
        fs.writeFileSync(join(options.outputDir, `${i.name}.sparql`), queryString);   
    }
}