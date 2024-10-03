# Vagrantfile to provision OratorIQ environment

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"
  
  config.vm.provider "virtualbox" do |v|
    v.memory = 8192
    v.cpus = 6
  end

  config.vm.synced_folder "app/", "/app"

  config.vm.provision "shell", path: "setup.sh", privileged: false

  config.vm.network "forwarded_port", guest: 3000, host: 3030
  config.vm.network "private_network", type: "dhcp" # host only network
end
