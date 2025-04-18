import { NextRequest, NextResponse } from 'next/server';

interface TelemetryData {
  event?: string;
  timestamp?: string;
  sessionId?: string;
  data?: Record<string, any>;
  [key: string]: any;
}

/**
 * API route to handle telemetry data from the assessment
 */
export async function POST(request: NextRequest) {
  try {
    // Check if request has content before parsing
    const contentType = request.headers.get('content-type') || '';
    let telemetryData: TelemetryData = {};
    
    if (contentType.includes('application/json')) {
      try {
        const text = await request.text();
        if (text && text.trim().length > 0) {
          telemetryData = JSON.parse(text);
        }
      } catch (parseError) {
        console.warn('Failed to parse telemetry JSON:', parseError);
        // Continue with empty telemetry data
      }
    }
    
    // Structure expected data for consistency 
    const structuredData = {
      event: telemetryData.event || 'unknown_event',
      timestamp: telemetryData.timestamp || new Date().toISOString(),
      sessionId: telemetryData.sessionId || 'unknown_session',
      data: telemetryData.data || {},
      userAgent: request.headers.get('user-agent') || 'unknown',
      path: request.headers.get('referer') || 'unknown'
    };
    
    // Log telemetry data in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Telemetry: [${structuredData.event}] from session ${structuredData.sessionId?.substring(0, 8) || 'unknown'}...`);
    }
    
    // In production, you might save this to a database or analytics platform
    
    return NextResponse.json(
      { success: true, message: 'Telemetry data received' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing telemetry:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process telemetry data' },
      { status: 500 }
    );
  }
} 