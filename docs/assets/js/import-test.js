// Test suite for YAGSL JSON import functionality
function runImportTests() {
    console.group('Running YAGSL Import Tests');
    let testsPassed = 0;
    let testsFailed = 0;

    // Test helper to compare values with type checking
    function assertEqual(actual, expected, message) {
        const actualType = typeof actual;
        const expectedType = typeof expected;
        // Treat JSON null and empty string in inputs as equivalent
        if ((expected === null && (actual === '' || actual === null)) ||
            (actual === null && (expected === '' || expected === null))) {
            console.log(`✓ ${message}`);
            testsPassed++;
            return true;
        }

        if (actualType !== expectedType) {
            console.error(`❌ ${message} - Type mismatch: expected ${expectedType}, got ${actualType}`);
            testsFailed++;
            return false;
        }

        if (actual !== expected) {
            console.error(`❌ ${message} - Value mismatch: expected ${expected}, got ${actual}`);
            testsFailed++;
            return false;
        }
        
        console.log(`✓ ${message}`);
        testsPassed++;
        return true;
    }

    // Test helper to verify form field value matches JSON value
    function testFormField(formName, fieldName, expectedValue) {
        const $form = $(`#${formName}-form`);
        const $field = $form.find(`[name="${fieldName}"]`);
        
        if ($field.length === 0) {
            console.error(`❌ Field not found: ${formName}-form [name="${fieldName}"]`);
            testsFailed++;
            return false;
        }

        let actualValue;
        if ($field.attr('type') === 'checkbox') {
            actualValue = $field.prop('checked');
        } else if (fieldName.toLowerCase().includes('canbus')) {
            // For CAN bus fields, check the data-is-null attribute
            actualValue = $field.attr('data-is-null') === 'true' ? null : $field.val();
        } else {
            actualValue = $field.val();
        }

        // Convert to same type for comparison
        const expected = typeof actualValue === 'string' ? String(expectedValue) : expectedValue;
        return assertEqual(actualValue, expected, `${formName}.${fieldName}`);
    }

    // Test loading each JSON file
    const files = [
        'controllerproperties.json',
        'swervedrive.json',
        'modules/physicalproperties.json',
        'modules/frontleft.json',
        'modules/frontright.json',
        'modules/backleft.json',
        'modules/backright.json',
        'modules/pidfproperties.json'
    ];

    // Load and test each JSON file
    Promise.all(files.map(file => 
        fetch(`/extract/swerve/${file}`)
            .then(response => response.json())
            .then(json => ({file, json}))
    )).then(results => {
        results.forEach(({file, json}) => {
            console.group(`Testing ${file}`);
            
            // Get the form name from the file path
            const formName = file.split('/').pop().replace('.json', '');
            
            // Update the form with the JSON data
            $(`#${formName}-json`).text(JSON.stringify(json, null, 2));
            populateFormFromObject(formName, json);
            
            // Test each field in the JSON
            function testObjectFields(obj, prefix = '') {
                Object.entries(obj).forEach(([key, value]) => {
                    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                        // Handle nested objects
                        testObjectFields(value, prefix ? `${prefix}_${key}` : key);
                    } else if (!Array.isArray(value)) {
                        // Test non-array fields
                        const fieldName = prefix ? `${prefix}_${key}` : key;
                        testFormField(formName, fieldName, value);
                    }
                });
            }
            
            testObjectFields(json);
            console.groupEnd();
        });
        
        // Final test report
        console.group('Test Summary');
        console.log(`Total tests passed: ${testsPassed}`);
        console.log(`Total tests failed: ${testsFailed}`);
        console.groupEnd();
    }).catch(error => {
        console.error('Test error:', error);
    });

    console.groupEnd();
}

// Add a test button to the page
function addTestButton() {
    // Check if button already exists
    if (document.getElementById('run-import-tests')) return;

    const btn = document.createElement('button');
    btn.id = 'run-import-tests';
    btn.type = 'button';
    // Make sizing consistent with other buttons but keep secondary color
    btn.className = 'btn btn-secondary btn-lg mt-2 mb-3';
    btn.textContent = 'Run Import Tests';
    btn.onclick = runImportTests;

    // Prefer to place the button into the #download-button container so all
    // action buttons are on the same horizontal row. If that's not present,
    // fall back to a fixed container.
    const downloadContainer = document.getElementById('download-button');
    if (downloadContainer) {
        // Ensure it's a flex container (v2.js also enforces this)
        downloadContainer.style.display = 'flex';
        downloadContainer.style.alignItems = 'center';
        downloadContainer.style.justifyContent = 'center';
        downloadContainer.style.gap = '10px';
        downloadContainer.appendChild(btn);
        return;
    }

    // Fallback: Get or create the fixed buttons container
    let fixedButtons = document.getElementById('fixed-buttons');
    if (!fixedButtons) {
        fixedButtons = document.createElement('div');
        fixedButtons.id = 'fixed-buttons';
        // Place it in top-right as a column of buttons
        fixedButtons.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            gap: 10px;
            flex-direction: column;
        `;
        document.body.appendChild(fixedButtons);
    }

    fixedButtons.appendChild(btn);
}

// Initialize test button
addTestButton();