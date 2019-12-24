const https = require('https');

exports.handler = (event, context, callback) => {
    try {
        // Get contacts from Monica
        const host = 'app.monicahq.com';
        const auth = {
            Authorization: `Bearer ${process.env.MONICA_TOKEN}`
        };
        const options = {
            hostname: host,
            path: '/api/contacts',
            headers: auth
        };
        console.log('Getting contacts from Monica...');
        https.get(options, (response) => {
            let data = '';
            response.on('data', function (chunk) {
                data += chunk;
            });
            
            response.on('end', function () {
                console.log('Data:', data);
                const contacts = JSON.parse(data).data;
               
                // Find latent contacts
                const now = (new Date()).getTime();
                let limit = 14*24*60*60*1000;
                if (event.queryStringParameters && event.queryStringParameters.limit) {
                    limit = event.queryStringParameters.limit*24*60*60*1000;
                }
                let latentContacts = '';
                for (const contact of contacts) {
                    let lastActivityTogether = new Date(contact.last_activity_together);
                    let lastCalled = new Date(contact.last_called);
                    if ((now - lastActivityTogether.getTime()) > limit && (now - lastCalled.getTime()) > limit) {
                        latentContacts += `<tr>
                            <td>${contact.first_name}&nbsp;${contact.last_name}</td>
                            <td>${lastActivityTogether.toDateString()}</td>
                            <td>${lastCalled.toDateString()}</td>
                        </tr>`;
                    }
                }
                
                // Create and send response
                const html = `<!DOCTYPE html>
                        <html>
                        <head>
                            <title>Sebastian's Monica Dashboard</title>
                            <meta name="viewport" content="width=device-width, initial-scale=1">
                            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
                        </head>
                        <body>
                            <h1>Latent contacts</h1>
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Last activity</th>
                                        <th>Last called</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${latentContacts}
                                </tbody>
                            </table>
                        </body>
                    </html>`;
                    
                const response = {
                      statusCode: 200,
                      headers: {
                        'Content-Type': 'text/html',
                      },
                      body: html,
                };
                callback(null, response);
            });
        });
    } catch (error) {
        const response = {
              statusCode: 500,
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        };
        callback(null, response);
    }
};