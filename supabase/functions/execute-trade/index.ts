import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { assetId, userId, percentage, mode, pricePerPercent } = await req.json();

    console.log(`Processing ${mode} trade:`, { assetId, userId, percentage, pricePerPercent });

    // Validate inputs
    if (!assetId || !userId || !percentage || !mode || !pricePerPercent) {
      throw new Error('Missing required fields');
    }

    if (percentage <= 0 || percentage > 100) {
      throw new Error('Invalid percentage');
    }

    // Get current ownership
    const { data: currentOwnership, error: fetchError } = await supabase
      .from('user_assets')
      .select('ownership_percent')
      .eq('user_id', userId)
      .eq('asset_id', assetId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching ownership:', fetchError);
      throw new Error('Failed to fetch current ownership');
    }

    const currentPercent = currentOwnership ? Number(currentOwnership.ownership_percent) : 0;
    console.log('Current ownership:', currentPercent);

    let newPercent: number;
    if (mode === 'buy') {
      newPercent = currentPercent + percentage;
      if (newPercent > 100) {
        throw new Error('Cannot own more than 100% of an asset');
      }
    } else {
      if (currentPercent < percentage) {
        throw new Error('Insufficient ownership to sell');
      }
      newPercent = currentPercent - percentage;
    }

    console.log('New ownership:', newPercent);

    // Update or insert user_assets
    if (newPercent === 0) {
      // Delete if selling all
      const { error: deleteError } = await supabase
        .from('user_assets')
        .delete()
        .eq('user_id', userId)
        .eq('asset_id', assetId);

      if (deleteError) {
        console.error('Error deleting ownership:', deleteError);
        throw new Error('Failed to update ownership');
      }
    } else if (currentOwnership) {
      // Update existing
      const { error: updateError } = await supabase
        .from('user_assets')
        .update({ ownership_percent: newPercent })
        .eq('user_id', userId)
        .eq('asset_id', assetId);

      if (updateError) {
        console.error('Error updating ownership:', updateError);
        throw new Error('Failed to update ownership');
      }
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('user_assets')
        .insert({
          user_id: userId,
          asset_id: assetId,
          ownership_percent: newPercent,
        });

      if (insertError) {
        console.error('Error inserting ownership:', insertError);
        throw new Error('Failed to create ownership');
      }
    }

    // Record transaction
    const totalPrice = percentage * pricePerPercent;
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        asset_id: assetId,
        buyer_id: mode === 'buy' ? userId : null,
        seller_id: mode === 'sell' ? userId : null,
        percent_traded: percentage,
        price_per_percent: pricePerPercent,
        total_price: totalPrice,
        transaction_type: mode,
      });

    if (txError) {
      console.error('Error recording transaction:', txError);
      throw new Error('Failed to record transaction');
    }

    console.log('Trade completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        newOwnership: newPercent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Trade error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
