import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const url = `${process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001'}/disk/upload`;
  
  try {
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'content-type': req.headers.get('content-type') || '',
      },
      body: req.body as unknown as BodyInit,
      // @ts-ignore - duplex is required for streaming request body in Node.js fetch
      duplex: 'half',
    };

    const response = await fetch(url, fetchOptions);
    
    return new Response(response.body, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json',
      }
    });
  } catch (err: any) {
    console.error('Next.js Upload Proxy Error:', err);
    return new Response(JSON.stringify({ message: err.message || 'NextJS Proxy Error' }), { 
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
