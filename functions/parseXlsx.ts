import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';
import * as xlsx from 'npm:xlsx@0.18.5';

// Helper function to convert worksheet to a simple array of arrays (raw data)
function sheet_to_json_raw(worksheet) {
    const json = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    // Filter out completely empty rows
    return json.filter(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== ''));
}


Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    if (!await base44.auth.isAuthenticated()) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { fileUrl } = await req.json();
        
        if (!fileUrl) {
            throw new Error('File URL is required.');
        }

        // Fetch the file from the provided URL
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        const workbook = xlsx.read(buffer, { type: 'buffer' });

        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert worksheet to a simple array of arrays (raw data)
        const rawData = sheet_to_json_raw(worksheet);

        return new Response(JSON.stringify({ success: true, data: { raw_data: rawData } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in parseXlsx function:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});