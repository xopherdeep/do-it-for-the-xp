import MyPortal from '@/views/Console/MyPortal/MyPortal'
import { mount } from '@vue/test-utils'
// import FolderPage from '@/views/FolderPage.vue'

describe('FolderPage.vue', () => {
  it('renders folder view', () => {
    const mockRoute = {
      params: {
        id: 'Outbox'
      }
    }
    const wrapper = mount(MyPortal, {
      global: {
        mocks: {
          $route: mockRoute
        }
      }
    })
    expect(wrapper.text()).toMatch('Explore UI Components')
  })
})
