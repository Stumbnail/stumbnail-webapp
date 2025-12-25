import { NextRequest, NextResponse } from 'next/server';

/**
 * Image Download Proxy API
 * 
 * This endpoint fetches images from external URLs and returns them as downloadable files.
 * It bypasses CORS restrictions that prevent client-side canvas export.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('url');
    const filename = searchParams.get('filename') || 'thumbnail.png';

    if (!imageUrl) {
        return NextResponse.json(
            { error: 'Missing url parameter' },
            { status: 400 }
        );
    }

    try {
        // Validate URL to prevent SSRF attacks
        const url = new URL(imageUrl);
        const allowedHosts = [
            'firebasestorage.googleapis.com',
            'storage.googleapis.com',
            'img.youtube.com',
            'i.ytimg.com',
            'lh3.googleusercontent.com',
        ];

        if (!allowedHosts.some(host => url.hostname.includes(host))) {
            return NextResponse.json(
                { error: 'URL host not allowed' },
                { status: 403 }
            );
        }

        // Fetch the image
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Stumbnail/1.0',
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch image: ${response.status}` },
                { status: response.status }
            );
        }

        // Get the image data
        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';

        // Return as downloadable file
        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        console.error('Download proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to download image' },
            { status: 500 }
        );
    }
}
