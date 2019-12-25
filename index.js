const https = require('https');

// Create response
function createResponse(event, context, callback, contacts) {
    // Find latent contacts
    const now = (new Date()).getTime();
    let query = 14;
    if (event.queryStringParameters && event.queryStringParameters.limit) {
        query = parseInt(event.queryStringParameters.limit);
    }
    const limit = query*24*60*60*1000;
    let starred = false;
    if (event.queryStringParameters && event.queryStringParameters.starred) {
        if (event.queryStringParameters.starred === 'yes') {
            starred = true;
        }
    }
    let latentContacts = '';
    for (const contact of contacts) {
        const lastActivityTogether = new Date(contact.last_activity_together);
        const lastCalled = new Date(contact.last_called);
        if ((now - lastActivityTogether.getTime()) > limit && (now - lastCalled.getTime()) > limit) {
            if (starred && !contact.is_starred) {
                continue;
            }
            latentContacts += `<tr>
                <td>${contact.first_name}&nbsp;${contact.last_name}
                    ${contact.is_starred ? '&#11088;' : ''}</td>
                <td>${lastActivityTogether.toDateString()}</td>
                <td>${lastCalled.toDateString()}</td>
            </tr>`;
        }
    }
    
    // Create HTML document and send response
    const html = `<!DOCTYPE html>
        <html lang="en">
            <head>
                <title>Sebastian's Monica Dashboard</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
            </head>
            <body>
                <div style="padding: 10px;">
                    <select id="limit" class="form-control" onchange="refresh()">
                        <option value="7" ${(query === 7) ? 'selected' : ''}>7 days</option>
                        <option value="14" ${(query === 14) ? 'selected' : ''}>14 days</option>
                        <option value="30" ${(query === 30) ? 'selected' : ''}>30 days</option>
                        <option value="60" ${(query === 60) ? 'selected' : ''}>60 days</option>
                        <option value="90" ${(query === 90) ? 'selected' : ''}>90 days</option>
                    </select>
                    <div style="padding-top: 10px;">
                        <input type="checkbox" id="starred" onclick="refresh()" ${starred ? 'checked' : ''}>
                        <label for="starred">Starred?</label>
                    </div>
                </div>
                <table class="table table-striped m-0">
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
                <script>
                    function refresh() {
                        var x = document.getElementById("limit").value;
                        var y = document.getElementById("starred").checked;
                        var loc = window.location.pathname + '?limit=' + x;
                        if (y) {
                            loc = loc + '&starred=yes';
                        }
                        window.location.href = loc;
                    }
                </script>
            </body>
        </html>`;
    const response = {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html',
          },
          body: html
    };
    callback(null, response);
}

// Get contacts from Monica
function getData(event, context, callback, options, contacts) {
    https.get(options, (response) => {
        let data = '';
        response.on('data', function (chunk) {
            data += chunk;
        });
        
        response.on('end', function () {
            const parsed = JSON.parse(data);
            contacts = contacts.concat(parsed.data);
            if (parsed.links && parsed.links.next != null && parsed.links.next !== '') {
                options.path = parsed.links.next.replace('https://', '').replace(options.hostname, '') +
                    '&limit=100';
                getData(event, context, callback, options, contacts);
            } else {
                createResponse(event, context, callback, contacts);
            }
        });
    });
}

exports.handler = (event, context, callback) => {
    // Define options for the HTTPS client
    const options = {
        hostname: 'app.monicahq.com',
        path: '/api/contacts?limit=100',
        headers: {
            Authorization: `Bearer ${process.env.MONICA_TOKEN}`
        }
    };
    
    // Create the contacts array
    let contacts = [];
    
    // Start process of getting data and creating the response
    getData(event, context, callback, options, contacts);
};
