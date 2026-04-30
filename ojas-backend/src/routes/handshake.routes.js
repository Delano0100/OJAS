import express from 'express'
import axios from 'axios'

const router = express.Router()

const DLMS_BASE_URL = 'https://ojas-dlms-service.onrender.com'

// GET /api/handshake?sid=<session_id>
router.get('/', async (req, res) => {
  const { sid } = req.query

  if (!sid) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_PARAM',
        message: 'Missing required query param: sid (session id)',
      },
    })
  }

  console.log(`\n[DLMS] Triggering handshake for sid: ${sid}`)
  console.log(`[DLMS] Calling: ${DLMS_BASE_URL}/encode/handshake?sid=${sid}`)

  try {
    const dlmsResponse = await axios.get(`${DLMS_BASE_URL}/encode/handshake`, {
      params: { sid },
      timeout: 10000,
    })

    console.log('\n[DLMS] ✅ Response received:')
    console.log('[DLMS] Status :', dlmsResponse.status)
    console.log('[DLMS] Data   :', JSON.stringify(dlmsResponse.data, null, 2))

    return res.status(200).json({
      success: true,
      dlms_status: dlmsResponse.status,
      dlms_response: dlmsResponse.data,
    })

  } catch (error) {
    if (error.response) {
      console.error('\n[DLMS] ❌ Error Response:')
      console.error('[DLMS] Status :', error.response.status)
      console.error('[DLMS] Data   :', JSON.stringify(error.response.data, null, 2))

      return res.status(error.response.status).json({
        success: false,
        dlms_status: error.response.status,
        dlms_error: error.response.data,
      })

    } else if (error.request) {
      console.error('\n[DLMS] ❌ No response from DLMS service (timeout or network error)')
      return res.status(504).json({
        success: false,
        error: {
          code: 'DLMS_TIMEOUT',
          message: 'DLMS service did not respond. Timeout or network error.',
        },
      })

    } else {
      console.error('\n[DLMS] ❌ Unexpected error:', error.message)
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
      })
    }
  }
})

export default router
