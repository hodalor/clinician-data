import {
  AppShell,
  Avatar,
  Box,
  Button,
  Group,
  Menu,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/use-auth';
import { canAccess, navItems } from '../routes/permissions';

export function AdminShell() {
  const { session, logout } = useAuth();
  const location = useLocation();
  const role = session?.user.role;
  const visibleItems = navItems.filter((item) => canAccess(role, item.roles));

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 220, breakpoint: 0 }}
      padding="lg"
      styles={{
        main: {
          background:
            'radial-gradient(circle at top right, rgba(201,154,73,0.14), transparent 22%), linear-gradient(180deg, #f7f2e8 0%, #f3f4f6 100%)',
          minHeight: '100vh',
        },
        navbar: {
          background:
            'linear-gradient(180deg, #16120d 0%, #221a10 100%)',
          borderRight: '1px solid #4a3820',
        },
        header: {
          background: 'rgba(255,255,255,0.92)',
          borderBottom: '1px solid #e4d3ab',
          backdropFilter: 'blur(10px)',
        },
      }}
    >
      <AppShell.Header px="lg">
        <Group justify="flex-end" align="center" style={{ height: '100%' }}>
          <Menu shadow="md" width={220} position="bottom-end">
            <Menu.Target>
              <UnstyledButton>
                <Group gap="sm">
                  <Avatar radius="xl" color="dark">
                    {session?.user.full_name?.charAt(0) ?? 'U'}
                  </Avatar>
                  <Text fw={600} size="sm">
                    Profile
                  </Text>
                </Group>
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Signed in user</Menu.Label>
              <Menu.Item disabled>{session?.user.full_name}</Menu.Item>
              <Menu.Item disabled>{session?.user.role}</Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                onClick={() => {
                  void logout();
                }}
              >
                Sign out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p={0}>
        <Stack gap={0} style={{ height: '100%' }}>
          <Box px="md" py="sm" style={{ borderBottom: '1px solid #4a3820', flexShrink: 0 }}>
            <Text fw={800} size="lg" c="#f2d18b">
              SEU Study
            </Text>
            <Text size="sm" c="#d7c39d">
              Admin console
            </Text>
          </Box>

          <Box
            className="sidebar-scroll"
            px="sm"
            py="sm"
            style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
          >
            <Stack gap={6}>
              {visibleItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Button
                    key={item.path}
                    component={NavLink}
                    to={item.path}
                    justify="flex-start"
                    variant={isActive ? 'filled' : 'subtle'}
                    color={isActive ? 'yellow' : 'gray'}
                    size="sm"
                    px="sm"
                    style={{
                      minHeight: 40,
                      fontWeight: 600,
                      color: isActive ? '#16120d' : '#f3e5c6',
                      background: isActive
                        ? 'linear-gradient(180deg, #e5c176 0%, #c89a3f 100%)'
                        : 'transparent',
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Stack>
          </Box>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Group align="flex-start">
          <Box w="100%">
            <Outlet />
          </Box>
        </Group>
      </AppShell.Main>
    </AppShell>
  );
}
