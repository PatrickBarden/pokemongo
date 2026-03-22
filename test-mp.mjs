import 'dotenv/config';

const headers = {
  apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  Authorization: 'Bearer ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
};

async function run() {
  const usersRes = await fetch('https://dzpgumyavckfqznxgckn.supabase.co/rest/v1/users?select=id&limit=1', { headers });
  const users = await usersRes.json();
  const buyerId = users[0].id;

  const listingsRes = await fetch('https://dzpgumyavckfqznxgckn.supabase.co/rest/v1/listings?select=id,seller_id,pokemon_name,price&limit=1', { headers });
  const listings = await listingsRes.json();
  const listing = listings[0];

  const payload = {
    userId: buyerId,
    total_amount: Math.max(listing.price || 10, 10),
    items: [{
      listing_id: listing.id,
      seller_id: listing.seller_id,
      pokemon_name: listing.pokemon_name,
      price: Math.max(listing.price || 10, 10),
      quantity: 1
    }]
  };

  const res = await fetch('http://localhost:3000/api/mercadopago/create-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}
run().catch(console.error);
