import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `I am uploading a file containing a 15-minute load curve (timestamp + consumption values).
Please perform the following steps:

1. Load Curve Analysis
- Read the file fully (CSV, header assumed).
- Compute:
  * Total annual consumption
  * Average daily consumption
  * Peak load
  * Time-of-day consumption split (00–06h, 06–12h, 12–18h, 18–24h)
- Identify whether consumption is primarily daytime-driven, evening-driven, night-driven, or mixed.

2. Investment Mix Logic
Based on the load behaviour, determine:
- Recommended share of PV (should match or slightly exceed daytime demand; can include surplus to charge battery).
- Recommended share of wind (to cover night & winter needs and diversify seasonal risk).
- Recommended battery storage share (sized as % of daily energy to cover evening peaks and load shifting needs).

3. Final Output
Provide a single recommended percentage for each investment category (not ranges) based on your analysis.

4. Deliver in JSON
Format the final answer exactly as:
{
  "recommended_mix": {
    "PV": <number>,
    "Wind": <number>,
    "Battery": <number>
  }
}

Here is the CSV data:

${fileContent}`;

    console.log('Calling Lovable AI Gateway...');
    
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

    const data = await response.json();
    console.log('AI Gateway response received');
    
    const aiResponse = data.choices?.[0]?.message?.content;
    
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
    console.log('Analysis complete:', result);

    return new Response(
      JSON.stringify({ result }),
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