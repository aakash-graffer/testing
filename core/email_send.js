
const handleBars = require('handlebars');
const fs = require('fs');

let _replacements;
function template(replacements) {
  _replacements = replacements;
   
   return _replacements
}

let readHTMLFile = function(path, callback ) {
    fs.readFile(path, {encoding: 'utf-8'}, function (err, html) {
        if (err) {
            throw err;
        }
        else {
            callback(null, html);
        }
    });
};

readHTMLFile( __dirname+'/../public/email.html', function(err, html) {

    // Compile html file 
    let _template = handleBars.compile(html) ;

    // Replacement content
    let htmlToSend = _template(_replacements);
    
   
});

module.exports = { template }