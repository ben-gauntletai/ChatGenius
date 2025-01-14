import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') });

// Verify environment variables are loaded
console.log('Environment variables loaded:');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
console.log('PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? 'Present' : 'Missing');
console.log('PINECONE_INDEX:', process.env.PINECONE_INDEX ? 'Present' : 'Missing'); 