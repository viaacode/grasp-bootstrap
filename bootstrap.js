import { Parser, TreeToGraphQL } from 'graphql-js-tree';
import * as fs from 'fs';
import program from 'commander';
import {join} from 'path';

program
  .option('-i, --inputFile')
  .option('-o, --outputDir');

program.parse();

const options = program.opts();

const schemaFileContents = fs.readFileSync(options.inputFile,
{ encoding: 'utf8', flag: 'r' });
const parsedSchema = Parser.parse(schemaFileContents);

for (const i of parsedSchema.nodes){
    if(i.type.fieldType.name === 'type'){
        let queryString = 'PREFIX : <https://github.com/dbcls/grasp/ns/>\n\n'
        queryString += '# ${i.name}'
        queryString += 'CONSTRUCT {\n'
        
        for (const arg of i.args){
            queryString += `  ?iri :${arg.name} ?${arg.name} .\n`
        }
        queryString += '} WHERE {\n'
        for (const arg of i.args){
            queryString += `  BIND(?${arg.name}_res AS ?${arg.name})\n`
        }
        queryString += '{{#if iri}}'
        queryString += 'VALUES ?iri { {{join " " (as-iriref iri)}} }'
        queryString += '{{/if}}'
        queryString += '}'
        fs.writeFileSync(join(options.outputDir, `${i.name}.sparql`), queryString);   
    }
}