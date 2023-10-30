const swaggerAutogen = require('swagger-autogen')()

const outputFile = './swagger_output.json'
const endpointsFiles = ['./routes/index.js']
const config = {
    info: {
        title: 'Blog API Documentation',
        description: '',
    },
    tags: [ ],
    host: 'localhost:3001',
    schemes: ['http', 'https'],
};
swaggerAutogen(outputFile, endpointsFiles, config)