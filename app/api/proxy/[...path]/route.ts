import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.eventsfactory.rw/api/abstract'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path, 'POST')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path, 'PUT')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path, 'PATCH')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params

  // Only superadmins may delete abstracts
  if (path[0] === 'abstracts' && path.length === 2) {
    const authorization = request.headers.get('authorization')
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
      if (!payload.isSuperAdmin) {
        return NextResponse.json({ message: 'Forbidden: only superadmins can delete abstracts' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
  }

  return proxyRequest(request, path, 'DELETE')
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const path = pathSegments.join('/')
    const search = request.nextUrl.search
    const url = `${API_BASE_URL}/${path}${search}`

    // Get authorization header
    const authorization = request.headers.get('authorization')

    // Get request body if present
    let body
    if (method !== 'GET' && method !== 'DELETE') {
      body = await request.text()
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (authorization) {
      headers['Authorization'] = authorization
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body || undefined,
    })

    const data = await response.text()

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { message: 'Proxy error', error: String(error) },
      { status: 500 }
    )
  }
}
