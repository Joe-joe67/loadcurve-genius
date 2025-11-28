const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoadCurveData {
  timestamp: Date;
  value: number;
}

function parseCSV(content: string): LoadCurveData[] {
  const lines = content.trim().split('\n');
  const data: LoadCurveData[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const [timestamp, value] = lines[i].split(',');
    if (timestamp && value) {
      data.push({
        timestamp: new Date(timestamp),
        value: parseFloat(value)
      });
    }
  }
  
  return data;
}

function analyzeLoadCurve(data: LoadCurveData[]) {
  if (data.length === 0) {
    throw new Error('No data to analyze');
  }

  // Calculate total annual consumption (sum of all values)
  const totalConsumption = data.reduce((sum, d) => sum + d.value, 0);
  
  // Calculate average daily consumption
  const firstDate = data[0].timestamp;
  const lastDate = data[data.length - 1].timestamp;
  const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
  const avgDailyConsumption = totalConsumption / daysDiff;
  
  // Find peak load
  const peakLoad = Math.max(...data.map(d => d.value));
  
  // Time-of-day consumption splits
  const timeSlots = {
    night: 0,      // 00-06h
    morning: 0,    // 06-12h
    afternoon: 0,  // 12-18h
    evening: 0     // 18-24h
  };
  
  data.forEach(d => {
    const hour = d.timestamp.getHours();
    if (hour >= 0 && hour < 6) timeSlots.night += d.value;
    else if (hour >= 6 && hour < 12) timeSlots.morning += d.value;
    else if (hour >= 12 && hour < 18) timeSlots.afternoon += d.value;
    else timeSlots.evening += d.value;
  });
  
  // Convert to percentages
  const timeSlotPercentages = {
    night: (timeSlots.night / totalConsumption) * 100,
    morning: (timeSlots.morning / totalConsumption) * 100,
    afternoon: (timeSlots.afternoon / totalConsumption) * 100,
    evening: (timeSlots.evening / totalConsumption) * 100
  };
  
  // Determine consumption pattern
  let pattern = 'mixed';
  const max = Math.max(...Object.values(timeSlotPercentages));
  if (timeSlotPercentages.afternoon === max && timeSlotPercentages.afternoon > 35) {
    pattern = 'daytime-driven';
  } else if (timeSlotPercentages.evening === max && timeSlotPercentages.evening > 35) {
    pattern = 'evening-driven';
  } else if (timeSlotPercentages.night === max && timeSlotPercentages.night > 30) {
    pattern = 'night-driven';
  }
  
  return {
    totalConsumption: totalConsumption.toFixed(2),
    avgDailyConsumption: avgDailyConsumption.toFixed(2),
    peakLoad: peakLoad.toFixed(4),
    timeOfDay: {
      night_00_06h: timeSlotPercentages.night.toFixed(1) + '%',
      morning_06_12h: timeSlotPercentages.morning.toFixed(1) + '%',
      afternoon_12_18h: timeSlotPercentages.afternoon.toFixed(1) + '%',
      evening_18_24h: timeSlotPercentages.evening.toFixed(1) + '%'
    },
    pattern,
    dataPoints: data.length
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent } = await req.json();
    
    if (!fileContent) {
      return new Response(
        JSON.stringify({ error: 'No file content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing CSV data...');
    const data = parseCSV(fileContent);
    console.log(`Parsed ${data.length} data points`);
    
    console.log('Analyzing load curve...');
    const analysis = analyzeLoadCurve(data);
    console.log('Analysis complete:', analysis);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Based on the following load curve analysis, determine the optimal investment mix for renewable energy:

Load Curve Analysis:
- Total Annual Consumption: ${analysis.totalConsumption} kWh
- Average Daily Consumption: ${analysis.avgDailyConsumption} kWh
- Peak Load: ${analysis.peakLoad} kW
- Time-of-Day Breakdown:
  * Night (00-06h): ${analysis.timeOfDay.night_00_06h}
  * Morning (06-12h): ${analysis.timeOfDay.morning_06_12h}
  * Afternoon (12-18h): ${analysis.timeOfDay.afternoon_12_18h}
  * Evening (18-24h): ${analysis.timeOfDay.evening_18_24h}
- Consumption Pattern: ${analysis.pattern}
- Data Points Analyzed: ${analysis.dataPoints}

Based on this analysis:
1. Recommend the optimal share of PV (solar) - should align with daytime consumption patterns
2. Recommend the optimal share of Wind - to cover night/winter needs and diversify
3. Recommend the optimal share of Battery Storage - to handle peak evening loads and enable load shifting

CRITICAL: Provide THREE single percentage numbers that sum to 100. Do NOT provide ranges. If you consider a range, always return the MINIMUM value from that range.

Format your response EXACTLY as:

{
  "recommended_mix": {
    "PV": <number>,
    "Wind": <number>,
    "Battery": <number>
  }
}

No explanation, just the JSON.`;

    console.log('Calling Lovable AI Gateway with summary...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to analyze data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    console.log('AI Gateway response received');
    
    const aiResponse = aiData.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'No analysis result received' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', aiResponse);
      return new Response(
        JSON.stringify({ error: 'Invalid analysis format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(jsonMatch[0]);
    console.log('Final recommendation:', result);

    return new Response(
      JSON.stringify({ 
        result,
        analysis // Include the analysis for reference
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-load-curve:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});