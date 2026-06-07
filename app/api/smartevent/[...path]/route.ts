import { NextRequest, NextResponse } from 'next/server';

const SMARTEVENT_API_URL = 'https://app.smartevent.rw/Api';
const EVENT_CODE = 'k3sVGagjJNsk2wdPHFXVMGFIekVBaDhNL0ZkaGdIMTFaSHhrQWc9PQ==';
const BULK_INVITE_EVENT_CODE = '6a251ae181569';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path, 'POST');
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string,
) {
  try {
    const path = pathSegments.join('/');
    const url = `${SMARTEVENT_API_URL}/${path}`;

    // Check if this is a registration-related endpoint that needs FormData
    const isRegistrationEndpoint = [
      'Display-Registration-Categories',
      'Display-Categories-Form-Inputs',
      'Register-Delegate',
      'Invite-Bulk-Delegates',
    ].some((endpoint) => path.includes(endpoint));

    const headers: Record<string, string> = {};

    // Get authorization header - use event code for registration endpoints
    const authorization = request.headers.get('authorization');
    if (authorization) {
      headers['Authorization'] = authorization;
    } else if (path.includes('Registration-Page-Api')) {
      headers['Authorization'] = EVENT_CODE;
    }

    // Get request body if present
    let body: FormData | string | URLSearchParams | undefined;
    if (method !== 'GET') {
      if (isRegistrationEndpoint) {
        // For registration endpoints, preserve FormData format and add event_code/eventcode
        try {
          const clonedRequest = request.clone();
          const incomingFormData = await clonedRequest.formData();

          // Determine which event code field name to use
          const eventCodeField = path.includes('Invite-Bulk-Delegates') ? 'eventcode' : 'event_code';
          const eventCodeValue = path.includes('Invite-Bulk-Delegates') ? BULK_INVITE_EVENT_CODE : EVENT_CODE;

          // Create a new FormData with event code added
          const newFormData = new FormData();
          newFormData.append(eventCodeField, eventCodeValue);

          // Debug logging
          console.log(`[Proxy] Endpoint: ${path}`);
          console.log(`[Proxy] Event code field: ${eventCodeField}`);
          console.log(`[Proxy] Event code: ${EVENT_CODE.substring(0, 20)}...`);

          // Add all existing form fields
          incomingFormData.forEach((value, key) => {
            if (key !== 'event_code' && key !== 'eventcode') {
              newFormData.append(key, value);
            }
          });

          // Log all FormData fields
          console.log('[Proxy] FormData fields:');
          for (const [key, value] of newFormData.entries()) {
            console.log(`  ${key}: ${typeof value === 'string' ? value.substring(0, 50) : '[File]'}${typeof value === 'string' && value.length > 50 ? '...' : ''}`);
          }

          body = newFormData;
          // Don't set Content-Type header - let fetch handle it for FormData
          delete headers['Content-Type'];
        } catch {
          // Fallback: try URLSearchParams for non-FormData payloads
          try {
            const eventCodeField = path.includes('Invite-Bulk-Delegates') ? 'eventcode' : 'event_code';
            const eventCodeValue = path.includes('Invite-Bulk-Delegates') ? BULK_INVITE_EVENT_CODE : EVENT_CODE;
            const formParams = new URLSearchParams();
            formParams.append(eventCodeField, eventCodeValue);

            const jsonBody = await request.json();
            Object.entries(jsonBody).forEach(([key, value]) => {
              if (key !== 'event_code' && key !== 'eventcode') {
                formParams.append(key, String(value));
              }
            });

            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            body = formParams;
          } catch {
            // No valid body
            headers['Content-Type'] = 'application/json';
            body = undefined;
          }
        }
      } else {
        // Regular JSON body
        headers['Content-Type'] = 'application/json';
        try {
          body = await request.text();
        } catch {
          body = undefined;
        }
      }
    } else {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body instanceof FormData ? body : body?.toString() || undefined,
    });

    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('SmartEvent proxy error:', error);
    return NextResponse.json(
      { message: 'Proxy error', error: String(error) },
      { status: 500 },
    );
  }
}
