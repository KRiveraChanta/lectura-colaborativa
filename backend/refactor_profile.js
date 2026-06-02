const fs = require('fs');

let content = fs.readFileSync('frontend/src/components/UserProfile.tsx', 'utf8');

const isSelfLine = "const isSelf = currentUser?.id === id;";
content = content.replace(isSelfLine, isSelfLine + "\n  const hasLogros = canSeeLogros && completedBooks && completedBooks.length > 0;");

// find start of Card
const cardStartIdx = content.indexOf('<Card className="shadow-sm border-0 mb-5 text-center text-md-start">');
const cardEndStr = '          </div>\n        </Card>';
const cardEndIdx = content.indexOf(cardEndStr, cardStartIdx) + cardEndStr.length;

const cardBlock = content.substring(cardStartIdx, cardEndIdx).replace('mb-5', 'mb-0 h-100');

// find start of Logros
const logrosStartStr = '{canSeeLogros && completedBooks && completedBooks.length > 0 && (';
const logrosStartIdx = content.indexOf(logrosStartStr);
// find end of Logros
const logrosEndStr = '        )}\n';
const logrosEndIdx = content.indexOf(logrosEndStr, logrosStartIdx) + logrosEndStr.length;

let logrosBlock = content.substring(logrosStartIdx, logrosEndIdx);

// Modify Logros Block
logrosBlock = logrosBlock.replace('{canSeeLogros && completedBooks && completedBooks.length > 0 && (', '{hasLogros && (');
logrosBlock = logrosBlock.replace('<div className="mb-5">', '<div className="h-100 bg-white p-4 rounded shadow-sm d-flex flex-column" style={{ maxHeight: \'600px\', overflowY: \'auto\' }}>');
logrosBlock = logrosBlock.replace(/col-12 col-sm-6 col-lg-4/g, 'col-12 col-sm-6');

const newLogrosBlock = `        <div className="col-12 col-lg-5 mt-5 mt-lg-0">\n${logrosBlock.trim().slice(0, -1)}        </div>\n        )}\n`;

// construct new Row
const newRow = `        <div className="row mb-5">
          <div className={\`col-12 \${hasLogros ? 'col-lg-7' : ''}\`}>
            ${cardBlock}
          </div>
${newLogrosBlock}
        </div>`;

// Delete old card and old logros
content = content.substring(0, cardStartIdx) + newRow + content.substring(cardEndIdx, logrosStartIdx) + content.substring(logrosEndIdx);

content = content.replace("maxWidth: '1000px'", "maxWidth: '1200px'");

fs.writeFileSync('frontend/src/components/UserProfile.tsx', content, 'utf8');
console.log('Success');
