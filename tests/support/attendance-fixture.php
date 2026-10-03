<?php

// Synthetic fixtures are loaded only into the disposable frontend E2E SQLite database.
require getcwd().'/vendor/autoload.php';
$app = require getcwd().'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$databasePath = getenv('ZAVSYNC_E2E_DB') ?: '/tmp/zavsync-stage14-e2e.sqlite';
if (! app()->environment('testing') || config('database.default') !== 'sqlite'
    || config('database.connections.sqlite.database') !== $databasePath
    || ! preg_match('#^/tmp/zavsync-(?:stage14-e2e\.sqlite|attendance-e2e-[A-Za-z0-9._-]+)$#', $databasePath)) {
    throw new RuntimeException('Attendance fixture requires the disposable E2E SQLite database.');
}

$user = App\Models\User::factory()->create(['name' => 'Attendance Tester', 'email' => 'attendance@example.invalid']);
foreach (['A', 'B', 'C'] as $letter) {
    $company = App\Models\Company::factory()->create(['name' => 'Attendance Company '.$letter, 'timezone' => 'Asia/Karachi']);
    $role = App\Models\Role::factory()->for($company)->create(['name' => 'Attendance reviewer']);
    foreach (['employee.self.view', 'employee.attendance.view', 'employee.attendance.clock',
        'employee.attendance.correction.request', 'attendance.view', 'attendance.manage', 'attendance.corrections.manage'] as $permission) {
        $role->permissions()->attach(App\Models\Permission::query()->firstOrCreate(['name' => $permission]));
    }
    $member = App\Models\CompanyUser::query()->create(['company_id' => $company->id, 'user_id' => $user->id,
        'role_id' => $role->id, 'is_active' => true]);
    $employee = App\Models\Employee::factory()->for($company)->create(['created_by' => $user->id,
        'employee_code' => 'ATTENDANCE-'.$letter, 'full_name' => 'Attendance Employee '.$letter,
        'status' => $letter === 'B' ? 'resigned' : 'active']);
    if ($letter !== 'C') {
        $member->forceFill(['employee_id' => $employee->id])->save();
    }
    if ($letter === 'B') {
        App\Models\AttendanceSession::factory()->for($company)->for($employee)->create([
            'created_by' => $user->id, 'work_date' => '2026-10-02', 'timezone' => 'Asia/Karachi',
            'clock_in_at' => '2026-10-02 17:00:00', 'clock_out_at' => '2026-10-03 01:00:00',
            'worked_seconds' => 28800,
        ]);
    }
}
