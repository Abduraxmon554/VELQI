const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Course = require('../models/Course');
const User = require('../models/User');
const { logger } = require('../config/database');

const providerSettings = {
  click: ['CLICK_MERCHANT_ID', 'CLICK_SERVICE_ID', 'CLICK_SECRET_KEY'],
  payme: ['PAYME_MERCHANT_ID', 'PAYME_SECRET_KEY']
};
const orderExpiryMs = 24 * 60 * 60 * 1000;

function publicBaseUrl() {
  const value = process.env.PUBLIC_BASE_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') return null;
    return url.origin;
  } catch {
    return null;
  }
}

function providerStatus() {
  const baseUrl = publicBaseUrl();
  return Object.fromEntries(Object.entries(providerSettings).map(([name, keys]) => {
    const missing = keys.filter(key => !process.env[key]);
    if (!baseUrl) missing.push('PUBLIC_BASE_URL');
    return [name, { configured: missing.length === 0, enabled: missing.length === 0, missing }];
  }));
}

function createCheckoutUrl(method, order) {
  const baseUrl = publicBaseUrl();
  const amountTiyin = Math.round(order.totalAmount * 100);
  const returnUrl = `${baseUrl}/checkout?orderId=${order._id}`;

  if (method === 'click') {
    const params = new URLSearchParams({
      service_id: process.env.CLICK_SERVICE_ID,
      merchant_id: process.env.CLICK_MERCHANT_ID,
      amount: order.totalAmount.toFixed(2),
      transaction_param: order._id.toString(),
      return_url: returnUrl
    });
    return `https://my.click.uz/services/pay?${params.toString()}`;
  }

  const payload = [
    `m=${process.env.PAYME_MERCHANT_ID}`,
    `ac.order_id=${order._id}`,
    `a=${amountTiyin}`,
    `c=${returnUrl}`
  ].join(';');
  return `https://checkout.paycom.uz/${Buffer.from(payload).toString('base64url')}`;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function clickSign(params, action) {
  const input = action === 0
    ? `${params.click_trans_id}${params.service_id}${process.env.CLICK_SECRET_KEY}${params.merchant_trans_id}${params.amount}${params.action}${params.sign_time}`
    : `${params.click_trans_id}${params.service_id}${process.env.CLICK_SECRET_KEY}${params.merchant_trans_id}${params.merchant_prepare_id}${params.amount}${params.action}${params.sign_time}`;
  return crypto.createHash('md5').update(input).digest('hex');
}

function clickResponse(params, error, errorNote, extra = {}) {
  return {
    click_trans_id: params.click_trans_id,
    merchant_trans_id: params.merchant_trans_id,
    error,
    error_note: errorNote,
    ...extra
  };
}

async function fulfillOrder(order) {
  const userExists = await User.exists({ _id: order.user });
  if (!userExists) throw new Error(`To'lov qilingan buyurtmaning foydalanuvchisi topilmadi: ${order._id}`);
  const newlyEnrolled = [];
  for (const item of order.courses) {
    const courseId = item.course?._id || item.course;
    const enrollment = await User.updateOne(
      { _id: order.user, 'enrolledCourses.course': { $ne: courseId } },
      {
        $push: {
          enrolledCourses: { course: courseId },
          purchases: {
            course: courseId,
            amount: item.price,
            paymentId: order.providerTransactionId || order._id.toString()
          }
        }
      }
    );
    if (enrollment.modifiedCount) newlyEnrolled.push(courseId);
  }

  if (newlyEnrolled.length) await Course.updateMany({ _id: { $in: newlyEnrolled } }, { $inc: { enrolledStudents: 1 } });
}

async function revokeOrderAccess(order) {
  const user = await User.findById(order.user);
  if (!user) throw new Error(`Qaytarilgan buyurtmaning foydalanuvchisi topilmadi: ${order._id}`);

  const revokeIds = [];
  for (const item of order.courses) {
    const courseId = item.course?._id || item.course;
    const anotherPaidOrder = await Order.exists({
      _id: { $ne: order._id },
      user: order.user,
      paymentStatus: 'completed',
      'courses.course': courseId
    });
    if (!anotherPaidOrder) {
      const enrollmentIndex = user.enrolledCourses.findIndex(
        enrollment => enrollment.course.toString() === courseId.toString()
      );
      if (enrollmentIndex >= 0) {
        user.enrolledCourses.splice(enrollmentIndex, 1);
        revokeIds.push(courseId);
      }
      user.purchases = user.purchases.filter(
        purchase => purchase.course.toString() !== courseId.toString()
      );
    }
  }

  if (revokeIds.length) {
    await user.save();
    await Course.updateMany(
      { _id: { $in: revokeIds }, enrolledStudents: { $gt: 0 } },
      { $inc: { enrolledStudents: -1 } }
    );
  }
}

async function completeOrder(order) {
  if (order.paymentStatus === 'completed') {
    await fulfillOrder(order);
    return order;
  }
  if (order.paymentStatus !== 'pending' || order.status !== 'processing') {
    throw new Error('Buyurtma to‘lovni qabul qila olmaydi.');
  }

  const completed = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: 'pending', status: 'processing' },
    { $set: { paymentStatus: 'completed', status: 'completed', paidAt: new Date() } },
    { new: true }
  );
  const finalOrder = completed || await Order.findById(order._id);
  if (finalOrder.paymentStatus !== 'completed') throw new Error('Buyurtma holati yangilanmadi.');
  await fulfillOrder(finalOrder);
  return finalOrder;
}

function validPaymeAuth(req) {
  if (!process.env.PAYME_SECRET_KEY) return false;
  const header = req.get('authorization') || '';
  const match = header.match(/^Basic\s+([A-Za-z0-9+/]+=*)$/i);
  if (!match) return false;
  let credentials;
  try {
    credentials = Buffer.from(match[1], 'base64').toString();
  } catch {
    return false;
  }
  const separator = credentials.indexOf(':');
  if (separator < 0) return false;
  const login = credentials.slice(0, separator);
  const password = credentials.slice(separator + 1);
  return login === 'Paycom' && safeEqual(password, process.env.PAYME_SECRET_KEY);
}

function paymeError(id, code, message, data) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message: { uz: message, ru: message, en: message }, ...(data ? { data } : {}) }
  };
}

function paymeResult(id, result) {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function paymeTransaction(order) {
  return {
    create_time: order.providerTransactionTime,
    perform_time: order.providerPerformTime || 0,
    cancel_time: order.providerCancelTime || 0,
    transaction: order._id.toString(),
    state: order.providerState,
    reason: order.providerState < 0 ? (order.providerCancelReason || 5) : null
  };
}

async function findPaymeOrder(account) {
  if (!account || typeof account.order_id !== 'string' || !mongoose.Types.ObjectId.isValid(account.order_id)) {
    return null;
  }
  return Order.findOne({ _id: account.order_id, paymentMethod: 'payme' });
}

exports.getPaymentProviders = (req, res) => {
  res.status(200).json({ success: true, data: providerStatus() });
};

exports.startProviderCheckout = async (req, res, next) => {
  try {
    const method = req.body?.paymentMethod;
    if (!Object.hasOwn(providerSettings, method)) {
      return res.status(400).json({
        success: false,
        message: 'Click yoki Payme to‘lov usulini tanlang.'
      });
    }

    const config = providerStatus()[method];
    if (!config.enabled) {
      logger.warn(`Checkout ${method} sozlanmagan: ${config.missing.join(', ')}`);
      return res.status(503).json({
        success: false,
        message: `${method === 'click' ? 'Click' : 'Payme'} konfiguratsiyasi to‘liq emas.`,
        missing: config.missing
      });
    }

    const requestedIds = req.body?.courseIds;
    if (!Array.isArray(requestedIds) || requestedIds.length === 0 ||
        requestedIds.some(id => typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ success: false, message: 'Xarid qilinadigan kurslar noto‘g‘ri.' });
    }
    const courseIds = [...new Set(requestedIds)];
    const courses = await Course.find({
      _id: { $in: courseIds },
      isPublished: true,
      isApproved: true,
      isFree: false
    });
    if (courses.length !== courseIds.length) {
      return res.status(400).json({ success: false, message: 'Kurslardan biri mavjud emas yoki xarid uchun ochiq emas.' });
    }

    const user = await User.findById(req.user.id);
    const alreadyOwned = courses.some(course =>
      user.enrolledCourses.some(enrollment => enrollment.course.toString() === course._id.toString())
    );
    if (alreadyOwned) {
      return res.status(409).json({ success: false, message: 'Siz tanlangan kurslardan biriga allaqachon yozilgansiz.' });
    }

    const totalAmount = courses.reduce((sum, course) => sum + course.currentPrice, 0);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Buyurtma summasi noto‘g‘ri.' });
    }
    const order = await Order.create({
      user: user._id,
      courses: courses.map(course => ({
        course: course._id,
        price: course.currentPrice,
        title: course.title
      })),
      totalAmount,
      paymentMethod: method,
      paymentStatus: 'pending',
      status: 'processing'
    });

    res.status(200).json({
      success: true,
      orderId: order._id,
      checkoutUrl: createCheckoutUrl(method, order)
    });
  } catch (err) {
    next(err);
  }
};

exports.getPaymentStatus = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
      return res.status(400).json({ success: false, message: 'Buyurtma raqami noto‘g‘ri.' });
    }
    const order = await Order.findOne({ _id: req.params.orderId, user: req.user.id })
      .select('paymentMethod paymentStatus status totalAmount createdAt paidAt');
    if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi.' });
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

exports.clickCallback = async (req, res) => {
  const params = req.body || {};
  const action = Number(params.action);
  const fail = (code, note, extra) => res.status(200).json(clickResponse(params, code, note, extra));

  try {
    if (!process.env.CLICK_SECRET_KEY || !process.env.CLICK_SERVICE_ID || !process.env.CLICK_MERCHANT_ID) {
      return fail(-1, 'Merchant credentials are not configured');
    }
    if (!['0', '1'].includes(String(params.action)) ||
        String(params.service_id) !== String(process.env.CLICK_SERVICE_ID) ||
        String(params.merchant_id) !== String(process.env.CLICK_MERCHANT_ID)) {
      return fail(-2, 'Invalid service or merchant parameters');
    }
    if (!safeEqual(String(params.sign_string || '').toLowerCase(), clickSign(params, action))) {
      return fail(-1, 'SIGN CHECK FAILED');
    }
    if (!mongoose.Types.ObjectId.isValid(String(params.merchant_trans_id))) {
      return fail(-5, 'Order not found');
    }
    const order = await Order.findOne({ _id: params.merchant_trans_id, paymentMethod: 'click' });
    if (!order) return fail(-5, 'Order not found');
    if (Math.round(Number(params.amount) * 100) !== Math.round(order.totalAmount * 100)) {
      return fail(-2, 'Incorrect amount');
    }
    if (action === 0) {
      if (order.createdAt.getTime() + orderExpiryMs < Date.now()) {
        return fail(-4, 'Order has expired');
      }
      if (order.paymentStatus !== 'pending') return fail(-4, 'Order already paid or cancelled');
      if (order.providerTransactionId && order.providerTransactionId !== String(params.click_trans_id)) {
        return fail(-2, 'Transaction already exists');
      }
      if (order.providerTransactionId && order.providerPrepareId) {
        return fail(0, 'Success', { merchant_prepare_id: order.providerPrepareId });
      }
      const prepareId = Date.now();
      const preparedOrder = await Order.findOneAndUpdate(
        { _id: order._id, paymentStatus: 'pending', providerTransactionId: { $exists: false } },
        { $set: {
          providerTransactionId: String(params.click_trans_id),
          providerTransactionTime: Date.now(),
          providerPrepareId: prepareId,
          providerState: 1
        } },
        { new: true }
      );
      if (!preparedOrder) {
        const latestOrder = await Order.findById(order._id);
        if (latestOrder.providerTransactionId === String(params.click_trans_id) &&
            latestOrder.providerPrepareId) {
          return fail(0, 'Success', { merchant_prepare_id: latestOrder.providerPrepareId });
        }
        return fail(-2, 'Transaction already exists');
      }
      return fail(0, 'Success', { merchant_prepare_id: preparedOrder.providerPrepareId });
    }

    if (order.providerTransactionId !== String(params.click_trans_id) ||
        Number(params.merchant_prepare_id) !== order.providerPrepareId) {
      return fail(-6, 'Transaction not found');
    }
    if (Number(params.error) < 0) {
      if (order.paymentStatus === 'pending') {
        order.paymentStatus = 'failed';
        order.status = 'cancelled';
        order.providerState = -1;
        order.providerCancelTime = Date.now();
        await order.save();
      }
      return fail(0, 'Success', { merchant_confirm_id: order.providerPrepareId });
    }
    if (order.paymentStatus === 'completed') {
      await fulfillOrder(order);
      return fail(0, 'Success', { merchant_confirm_id: order.providerPrepareId });
    }
    await completeOrder(order);
    order.providerState = 2;
    order.providerPerformTime = Date.now();
    await order.save();
    return fail(0, 'Success', { merchant_confirm_id: order.providerPrepareId });
  } catch (err) {
    logger.error(`CLICK callback xatosi: ${err.message}`);
    return fail(-7, 'Internal processing error');
  }
};

exports.paymeCallback = async (req, res) => {
  const { id, method, params = {} } = req.body || {};
  const fail = (code, message, data) => res.status(200).json(paymeError(id, code, message, data));

  if (!process.env.PAYME_MERCHANT_ID || !validPaymeAuth(req)) {
    return fail(-32504, 'Invalid authorization');
  }

  try {
    if (method === 'CheckPerformTransaction') {
      const order = await findPaymeOrder(params.account);
      if (!order) return fail(-31001, 'Order not found', 'order_id');
      if (Number(params.amount) !== Math.round(order.totalAmount * 100)) {
        return fail(-31050, 'Incorrect amount', 'amount');
      }
      if (order.paymentStatus !== 'pending' || order.createdAt.getTime() + orderExpiryMs < Date.now()) {
        return fail(-31008, 'Order is unavailable for payment');
      }
      return res.status(200).json(paymeResult(id, { allow: true }));
    }

    if (method === 'CreateTransaction') {
      const order = await findPaymeOrder(params.account);
      if (!order) return fail(-31001, 'Order not found', 'order_id');
      if (Number(params.amount) !== Math.round(order.totalAmount * 100)) {
        return fail(-31050, 'Incorrect amount', 'amount');
      }
      const transactionId = String(params.id || '');
      const transactionTime = Number(params.time);
      if (!transactionId || !Number.isFinite(transactionTime)) return fail(-32602, 'Invalid transaction parameters');

      if (order.providerTransactionId === transactionId && order.providerState) {
        return res.status(200).json(paymeResult(id, paymeTransaction(order)));
      }
      if (order.paymentStatus !== 'pending' || order.providerTransactionId ||
          order.createdAt.getTime() + orderExpiryMs < Date.now()) {
        return fail(-31008, 'Order is unavailable for payment');
      }
      const preparedOrder = await Order.findOneAndUpdate(
        { _id: order._id, paymentStatus: 'pending', providerTransactionId: { $exists: false } },
        { $set: {
          providerTransactionId: transactionId,
          providerTransactionTime: transactionTime,
          providerState: 1
        } },
        { new: true }
      );
      if (!preparedOrder) {
        const latestOrder = await Order.findById(order._id);
        if (latestOrder.providerTransactionId === transactionId && latestOrder.providerState) {
          return res.status(200).json(paymeResult(id, paymeTransaction(latestOrder)));
        }
        return fail(-31008, 'Order is unavailable for payment');
      }
      return res.status(200).json(paymeResult(id, paymeTransaction(preparedOrder)));
    }

    if (method === 'PerformTransaction' || method === 'CancelTransaction' || method === 'CheckTransaction') {
      const transactionId = String(params.id || '');
      const order = await Order.findOne({ paymentMethod: 'payme', providerTransactionId: transactionId });
      if (!order) return fail(-31003, 'Transaction not found');

      if (method === 'CheckTransaction') {
        return res.status(200).json(paymeResult(id, paymeTransaction(order)));
      }

      if (method === 'PerformTransaction') {
        if (order.providerState === 2 && order.paymentStatus === 'completed') {
          await fulfillOrder(order);
          return res.status(200).json(paymeResult(id, paymeTransaction(order)));
        }
        if (order.providerState !== 1 || order.paymentStatus !== 'pending') {
          return fail(-31008, 'Transaction is not performable');
        }
        await completeOrder(order);
        order.providerState = 2;
        order.providerPerformTime = Date.now();
        await order.save();
        return res.status(200).json(paymeResult(id, paymeTransaction(order)));
      }

      const cancelReason = Number(params.reason);
      if (!Number.isInteger(cancelReason) || cancelReason < 1 || cancelReason > 5) {
        return fail(-32602, 'Invalid cancellation reason');
      }
      if (![1, 2, -1, -2].includes(order.providerState)) {
        return fail(-31003, 'Transaction cannot be cancelled');
      }
      if (order.providerState > 0) {
        order.providerState = order.providerState === 1 ? -1 : -2;
        order.providerCancelTime = Date.now();
        order.providerCancelReason = cancelReason;
        if (order.paymentStatus === 'completed') {
          order.paymentStatus = 'refunded';
          order.status = 'refunded';
        } else {
          order.paymentStatus = 'failed';
          order.status = 'cancelled';
        }
        await order.save();
      }
      if (order.providerState === -2 && order.paymentStatus === 'refunded') {
        await revokeOrderAccess(order);
      }
      return res.status(200).json(paymeResult(id, paymeTransaction(order)));
    }

    if (method === 'GetStatement') {
      const begin = Number(params.from);
      const end = Number(params.to);
      if (!Number.isFinite(begin) || !Number.isFinite(end) || begin > end) {
        return fail(-32602, 'Invalid statement period');
      }
      const orders = await Order.find({
        paymentMethod: 'payme',
        providerTransactionTime: { $gte: begin, $lte: end }
      });
      return res.status(200).json(paymeResult(id, {
        transactions: orders.map(order => ({
          id: order.providerTransactionId,
          time: order.providerTransactionTime,
          amount: Math.round(order.totalAmount * 100),
          account: { order_id: order._id.toString() },
          create_time: order.providerTransactionTime,
          perform_time: order.providerPerformTime || 0,
          cancel_time: order.providerCancelTime || 0,
          transaction: order._id.toString(),
          state: order.providerState,
          reason: order.providerState < 0 ? 5 : null
        }))
      }));
    }

    return fail(-32601, 'Method not found');
  } catch (err) {
    logger.error(`Payme callback xatosi (${method || 'unknown'}): ${err.message}`);
    return fail(-32400, 'Internal processing error');
  }
};
