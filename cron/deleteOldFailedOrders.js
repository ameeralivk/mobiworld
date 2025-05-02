
const Order = require('../models/orderSchema'); 


setInterval(async () => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  try {
    console.log('[INTERVAL] Checking for failed orders...');
    const result = await Order.deleteMany({
      status: 'Failed',
      createdOn: { $lte: thirtyMinutesAgo }
    });

    if (result.deletedCount > 0) {
      console.log(`[INTERVAL] Deleted ${result.deletedCount} failed orders older than 30 minutes`);
    } else {
      console.log('[INTERVAL] No orders to delete');
    }
  } catch (err) {
    console.error('[INTERVAL] Error deleting old failed orders:', err);
  }
}, 5 * 60 * 1000); 
