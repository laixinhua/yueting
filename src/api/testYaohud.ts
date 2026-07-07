import { Http } from '@capacitor-community/http'

const BASE_URL = 'https://api.yaohud.cn'
const API_KEY = 'b341ce7bce37b74d27621a8b29a8d6f1'

async function testApi() {
  try {
    console.log('Testing QQ search...')
    const response = await Http.request({
      method: 'GET',
      url: `${BASE_URL}/api/music/qq?key=${API_KEY}&msg=周杰伦&g=5`,
      headers: { 'Accept': 'application/json' }
    })
    
    console.log('Response status:', response.status)
    console.log('Response data:', response.data)
  } catch (error) {
    console.error('Test failed:', error)
  }
}

export { testApi }