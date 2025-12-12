export default async function handler(req, res) {
  console.log('[API DEBUG] studyId handler called');
  console.log('[API DEBUG] Method:', req.method);
  console.log('[API DEBUG] URL:', req.url);
  
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('[API DEBUG] OPTIONS request, returning 200');
    return res.status(200).end();
  }

  function requireEnv(name, value) {
    if (!value) {
      console.error(`[API DEBUG] Missing environment variable: ${name}`);
      throw new Error(`Missing required environment variable: ${name}`);
    }
    console.log(`[API DEBUG] Environment variable ${name} found: ${value ? 'YES (value hidden for security)' : 'NO'}`);
    return value;
  }

  try {
    console.log('[API DEBUG] Checking environment variables...');
    console.log('[API DEBUG] process.env keys:', Object.keys(process.env).filter(k => k.includes('STUDY') || k.includes('API') || k.includes('LICENSE')));
    console.log('[API DEBUG] STUDY_ID exists:', !!process.env.STUDY_ID);
    
    const studyId = requireEnv('STUDY_ID', process.env.STUDY_ID);
    
    console.log('[API DEBUG] Returning success response');
    res.status(200).json({
      status: '200',
      studyId: studyId,
    });
  } catch (error) {
    console.error('[API DEBUG] Error in studyId handler:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      status: '500', 
      error: message 
    });
  }
}
