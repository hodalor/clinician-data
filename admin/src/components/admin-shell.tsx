import {
  AppShell,
  Avatar,
  Box,
  Burger,
  Button,
  Group,
  Menu,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/use-auth';
import { canAccess, navItems } from '../routes/permissions';

export function AdminShell() {
  const { session, logout } = useAuth();
  const location = useLocation();
  const [opened, { toggle, close }] = useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 48em)');
  const role = session?.user.role;
  const visibleItems = navItems.filter((item) => canAccess(role, item.roles));
  const navbarWidth = 220;

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: isMobile ? 260 : navbarWidth,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding={{ base: 'sm', sm: 'lg' }}
      styles={{
        main: {
          background:
            'radial-gradient(circle at top right, rgba(201,154,73,0.14), transparent 22%), linear-gradient(180deg, #f7f2e8 0%, #f3f4f6 100%)',
          minHeight: '100vh',
        },
        navbar: {
          top: 0,
          height: '100vh',
          background: 'linear-gradient(180deg, #16120d 0%, #221a10 100%)',
          borderRight: '1px solid #4a3820',
        },
        header: {
          left: isMobile ? 0 : navbarWidth,
          width: isMobile ? '100%' : `calc(100% - ${navbarWidth}px)`,
          background: 'rgba(255,255,255,0.92)',
          borderBottom: '1px solid #e4d3ab',
          backdropFilter: 'blur(10px)',
        },
      }}
    >
      <AppShell.Header px="lg">
        <Group justify="space-between" align="center" style={{ height: '100%' }}>
          <Group gap="sm" align="center">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              aria-label="Toggle navigation"
            />
            <Text fw={700} size="sm" c="dimmed">
              Admin console
            </Text>
          </Group>

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
          <Box
            px="md"
            py="lg"
            style={{
              borderBottom: '1px solid #4a3820',
              flexShrink: 0,
            }}
          >
            <Text fw={800} size="xl" c="#f2d18b" lh={1.1}>
              SEU Study
            </Text>
            <Text size="sm" c="#d7c39d" mt={6}>
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
                    onClick={() => {
                      if (isMobile) {
                        close();
                      }
                    }}
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
